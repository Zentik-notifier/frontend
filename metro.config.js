// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withShareExtension } = require("expo-share-extension/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = withShareExtension(getDefaultConfig(__dirname), {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});
// const config = getDefaultConfig(__dirname);
// Add wasm asset support
config.resolver.assetExts.push('wasm');

// Add COEP and COOP headers to support SharedArrayBuffer
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
