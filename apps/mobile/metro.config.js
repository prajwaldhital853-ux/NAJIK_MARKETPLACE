const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Metro sometimes fails to resolve Expo's TS async-require re-export on Windows.
config.transformer.asyncRequireModulePath = path.resolve(
  __dirname,
  "node_modules/expo/src/async-require/asyncRequireModule.ts",
);

module.exports = config;
