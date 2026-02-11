const { commonEntitlements } = require('../../config-shared');

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: 'https://raw.githubusercontent.com/Zentik-notifier/backend/refs/heads/main/assets/Zentik.png',
  entitlements: { ...commonEntitlements },
  name: "WidgetExtension",
  bundleIdentifier: ".WidgetExtension",
  displayName: "Widget extension",
});