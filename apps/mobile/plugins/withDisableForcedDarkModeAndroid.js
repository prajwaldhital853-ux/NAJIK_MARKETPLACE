const {
  withAndroidStyles,
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");

function setForceDarkModeToFalse(styles) {
  return AndroidConfig.Styles.assignStylesValue(styles, {
    add: true,
    parent: AndroidConfig.Styles.getAppThemeLightNoActionBarGroup(),
    name: "android:forceDarkAllowed",
    value: "false",
  });
}

function withDisableForcedDarkModeAndroid(config) {
  config = withAndroidStyles(config, (config) => {
    config.modResults = setForceDarkModeToFalse(config.modResults);
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$ = app.$ || {};
    app.$["android:forceDarkAllowed"] = "false";
    return config;
  });

  return config;
}

module.exports = withDisableForcedDarkModeAndroid;
