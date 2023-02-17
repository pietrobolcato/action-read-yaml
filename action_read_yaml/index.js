/**
 * This file reads in a YAML configuration file and replaces variables in the file
 * with their resolved values. The resolved values are then output as actions outputs.
 *
 * If there are no variables in the configuration file, it will simply output the fields
 * as they are.
 *
 * The variables are in the format `$(variableName)` and are replaced by their corresponding
 * values in the resolved object. If a variable is not defined, an error will be thrown.
 */

const core = require("@actions/core");
const fs = require("fs");
const yaml = require("js-yaml");

/**
 * Recursively replaces variables in a string
 * @param {string} value - The string value to replace variables in
 * @param {Object} resolved - Object containing resolved variables
 * @return {string} The string with all variables replaced
 */
const replaceVariables = (value, resolved) => {
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
};

/**
 * Main function to execute the action
 */
async function main() {
  try {
    const configData = core.getInput("config");

    fs.readFile(configData, "utf8", (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("Read data:\n", data);

      const SCHEMA = yaml.FAILSAFE_SCHEMA;
      const configYaml = yaml.load(data, { schema: SCHEMA });
      const resolved = {};

      // Resolve variables for each field in the config
      for (const key in configYaml) {
        resolved[key] = replaceVariables(configYaml[key], resolved);
      }

      Object.entries(resolved).map((val) => {
        const key = val[0];
        const value = val[1];

        core.setOutput(key, value);
      });
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
