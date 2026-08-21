const { withAndroidStyles, withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

function ensureForceDarkAllowedFalse(styles) {
  const resources = styles.resources || (styles.resources = {});
  const list = Array.isArray(resources.style) ? resources.style : resources.style ? [resources.style] : [];

  // Keep a single AppTheme — duplicates break :app:packageReleaseResources.
  const appThemes = list.filter((style) => style?.$?.name === "AppTheme");
  const keep = appThemes[0] || {
    $: {
      name: "AppTheme",
      parent: "Theme.AppCompat.Light.NoActionBar",
    },
    item: [],
  };

  const others = list.filter((style) => style?.$?.name !== "AppTheme");
  const items = Array.isArray(keep.item) ? keep.item : keep.item ? [keep.item] : [];
  const withoutForceDark = items.filter((item) => item?.$?.name !== "android:forceDarkAllowed");
  withoutForceDark.push({
    $: { name: "android:forceDarkAllowed" },
    _: "false",
  });
  keep.item = withoutForceDark;

  resources.style = [...others, keep];
  styles.resources = resources;
  return styles;
}

function withDisableForcedDarkModeAndroid(config) {
  config = withAndroidStyles(config, (config) => {
    config.modResults = ensureForceDarkAllowedFalse(config.modResults);
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
