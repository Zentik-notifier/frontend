// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require('expo/metro-config');
const { withShareExtension } = require("expo-share-extension/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = withShareExtension(getDefaultConfig(__dirname), {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});
// Add wasm asset support
config.resolver.assetExts.push('wasm');

const reactSyntaxHighlighterPath = path.resolve(__dirname, "lib", "react-syntax-highlighter.js");
const lowlightPath = path.resolve(__dirname, "lib", "lowlight", "index.js");
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-syntax-highlighter") {
    return { filePath: reactSyntaxHighlighterPath, type: "sourceFile" };
  }
  if (moduleName === "lowlight") {
    return { filePath: lowlightPath, type: "sourceFile" };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// Add COEP and COOP headers to support SharedArrayBuffer
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
