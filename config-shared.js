"use strict";

const isDev = process.env.APP_VARIANT === "development";
const bundleIdentifier = isDev ? "com.apocaliss92.zentik.dev" : "com.apocaliss92.zentik";
const productionBundleIdentifier = "com.apocaliss92.zentik";

exports.name = isDev ? "Zentik Dev" : "Zentik";
exports.commonEntitlements = {
  "com.apple.security.application-groups": [`group.${bundleIdentifier}`],
  "keychain-access-groups": [
    `$(AppIdentifierPrefix)${bundleIdentifier}.keychain`,
    "$(AppIdentifierPrefix)*",
  ],
  "com.apple.developer.icloud-services": ["CloudKit", "CloudDocuments"],
  "com.apple.developer.icloud-container-identifiers": isDev
    ? [`iCloud.${bundleIdentifier}`, `iCloud.${productionBundleIdentifier}`]
    : [`iCloud.${bundleIdentifier}`],
  "com.apple.developer.ubiquity-kvstore-identifier": `$(TeamIdentifierPrefix)${bundleIdentifier}`,
};
