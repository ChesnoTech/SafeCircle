const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const webShims = {
  'react-native-maps': path.resolve(__dirname, 'web-shims/react-native-maps.js'),
  'react-native-map-clustering': path.resolve(__dirname, 'web-shims/react-native-map-clustering.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return {
      filePath: webShims[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
