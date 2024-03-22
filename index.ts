/**
 * This file reads in a YAML configuration file and replaces variables in the file with their resolved values.
 * The resolved values are then output as actions outputs.
 *
 * If there are no variables in the configuration file, it will simply output the fields as they are.
 *
 * The variables are in the format `$(variableName)` and are replaced by their corresponding values in the
 * resolved object. If a variable is not defined, an error will be thrown.
 *
 * If the YAML configuration file contains nested values, the output keys will use a dot notation to represent
 * the hierarchy of the values. See README in the root of the repo for examples.
 */

import core from '@actions/core';
import fs from 'node:fs/promises';
import yaml from 'yaml';

/**
 * Recursively replaces variables in a string
 *
 * @param {string} value - The string value to replace variables in
 * @param {Object} resolved - Object containing resolved variables
 * @returns {string} The string with all variables replaced
 */
const replaceVariables = (value: string | Record<string, any>, resolved: Record<string, any>) => {
  if (typeof value === 'object') {
    // Recursively replace variables in nested objects
    const nestedObj: Record<string, any> = {};

    for (const key in value) {
      nestedObj[key] = replaceVariables(value[key], resolved);
    }

    return nestedObj;
  } else if (typeof value === 'string') {
    // Replace variables in string values
    let match = value.match(/\$\(([^\)]+)\)/);

    while (match !== null) {
      const varName = match[1];

      if (!resolved[varName]) {
        throw new Error(`Variable "${varName}" is not defined`);
      }

      value = value.replace(match[0], resolved[varName]);
      match = value.match(/\$\(([^\)]+)\)/);
    }

    return value;
  } else {
    // Non-string, non-object values are returned as-is
    return value;
  }
};

/** Main function to execute the action */
async function main() {
  try {
    const configData = core.getInput('config');
    const keyPathPattern = core.getInput('key-path-pattern');
    const envVarPrefix = core.getInput('env-var-prefix');

    const data = await fs.readFile(configData, 'utf8');

    if (keyPathPattern) {
      core.info(`\n\nkey-path-pattern is :: ${keyPathPattern}`);
      core.info('\n\n');
    }

    const configYaml = yaml.parse(data);
    const resolved: Record<string, any> = {};

    const resolveFields = (obj: Record<string, any>, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            core.setOutput(prefix + key + '.array', value);
          }
          resolveFields(value, prefix + key + '.');
        } else {
          resolved[prefix + key] = replaceVariables(value, resolved);
        }
      }
    };

    resolveFields(configYaml);

    const reKPP = RegExp(keyPathPattern, 'g');
    const reEnvVarPattern = RegExp('[.|-]', 'g');

    Object.entries(resolved).map((val) => {
      const key = val[0];
      const value = val[1];
      if (keyPathPattern) {
        if (key.match(reKPP)) {
          var k = key.replace(reKPP, '');
          core.info(`${k} : ${value}`);
          core.setOutput(k, value);
          if (envVarPrefix) {
            k = k.replace(reEnvVarPattern, '_');
            core.info(`${envVarPrefix}_${k}=${value}`);
            core.exportVariable(`${envVarPrefix}_${k}`, value);
          }
        }
      } else {
        core.info(`${key} : ${value}`);
        core.setOutput(key, value);
        if (envVarPrefix) {
          k = key.replace(reEnvVarPattern, '_');
          core.info(`${envVarPrefix}_${k}=${value}`);
          core.exportVariable(`${envVarPrefix}_${k}`, value);
        }
      }
    });
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

main();
