const { commonEntitlements } = require('../../app.config');

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: 'https://github.com/Zentik-notifier/backend/blob/main/assets/Zentik.png?raw=true',
  entitlements: { ...commonEntitlements },
  name: "WidgetExtension",
  bundleIdentifier: ".WidgetExtension",
  displayName: "Widget extension",
});