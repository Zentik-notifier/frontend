const { commonEntitlements, name } = require('../../app.config');

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "watch",
  colors: { $accent: "darkcyan", },
  deploymentTarget: "10.0",
  icon: 'https://github.com/Zentik-notifier/backend/blob/main/assets/Zentik.png?raw=true',
  entitlements: { ...commonEntitlements },
  name: "WatchExtension",
  bundleIdentifier: ".WatchExtension",
  displayName: name,
});