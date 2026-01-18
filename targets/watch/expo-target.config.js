const { commonEntitlements, name } = require('../../app.config');

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "watch",
  colors: { $accent: "darkcyan", },
  deploymentTarget: "10.0",
  icon: 'https://raw.githubusercontent.com/Zentik-notifier/backend/refs/heads/main/assets/Zentik.png',
  entitlements: { 
    "aps-environment": "production", // Required for CloudKit remote notifications
    ...commonEntitlements 
  },
  name: "WatchExtension",
  bundleIdentifier: ".WatchExtension",
  displayName: name,
});