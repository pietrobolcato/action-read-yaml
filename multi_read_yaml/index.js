/**
 * This file reads in YAML configuration files and replaces variables in the files
 * with their resolved values. The resolved values are then output as actions outputs.
 *
 * If there are no variables in the configuration files, it will simply output the fields
 * as they are.
 *
 * The variables are in the format `$(variableName)` and are replaced by their corresponding
 * values in the resolved object. If a variable is not defined, an error will be thrown.
 *
 * If the YAML configuration files contain nested values, the output keys will use a dot notation
 * to represent the hierarchy of the values. See README in the root of the repo for examples.
 */

const core = require("@actions/core");
const fs = require("fs");
const yaml = require("js-yaml");
const deepmerge = require("deepmerge");

/**
 * Recursively replaces variables in a string
 * @param {string} value - The string value to replace variables in
 * @param {Object} resolved - Object containing resolved variables
 * @return {string} The string with all variables replaced
 */
const replaceVariables = (value, resolved) => {
  if (typeof value === "object") {
    // Recursively replace variables in nested objects
    const nestedObj = {};

    for (const key in value) {
      nestedObj[key] = replaceVariables(value[key], resolved);
    }

    return nestedObj;
  } else if (typeof value === "string") {
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

/**
 * Main function to execute the action
 */
async function main() {
  try {
    const configFiles = core.getInput("config-files")
      .split(/[\r\n]/)
      .map(input => input.trim())
      .filter(input => input !== '');

    const keyPathPattern = core.getInput("key-path-pattern");
    const envVarPrefix = core.getInput("env-var-prefix");

    let mergedConfig = {};

    for (const configFile of configFiles) {
      const data = fs.readFileSync(configFile, "utf8");

      if (keyPathPattern) {
        core.info(`\n\nkey-path-pattern is :: ${keyPathPattern}`);
        core.info("\n\n");
      }

      console.log("Read data from", configFile, ":\n", data);

      const SCHEMA = yaml.FAILSAFE_SCHEMA;
      const configYaml = yaml.load(data, { schema: SCHEMA });
      mergedConfig = deepmerge(mergedConfig, configYaml);
    }

    const resolved = {};

    const resolveFields = (obj, prefix = "") => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object" && value !== null) {
          if (Array.isArray(value)) {
            core.setOutput(prefix + key + ".array", value);
          }
          resolveFields(value, prefix + key + ".");
        } else {
          resolved[prefix + key] = replaceVariables(value, resolved);
        }
      }
    };

    resolveFields(mergedConfig);

    const reKPP = RegExp(keyPathPattern, "g");
    const reEnvVarPattern = RegExp('[\.|\-]', "g");

    Object.entries(resolved).map((val) => {
      const key = val[0];
      const value = val[1];
      if (keyPathPattern) {
        if (key.match(reKPP)) {
          var k = key.replace(reKPP, '');
          core.info(`${k} : ${value}`);
          core.setOutput(k, value);
          if (envVarPrefix) {
            k = k.replace(reEnvVarPattern, "_");
            core.info(`${envVarPrefix}_${k}=${value}`);
            core.exportVariable(`${envVarPrefix}_${k}`, value);
          }
        }
      } else {
        core.info(`${key} : ${value}`);
        core.setOutput(key, value);
        if (envVarPrefix) {
          var k = key.replace(reEnvVarPattern, "_");
          core.info(`${envVarPrefix}_${k}=${value}`);
          core.exportVariable(`${envVarPrefix}_${k}`, value);
        }
      }
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

main();