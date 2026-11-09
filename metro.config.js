const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const nobleHashesRoot = path.resolve(__dirname, 'node_modules/@noble/hashes');
const nobleCiphersRoot = path.resolve(__dirname, 'node_modules/@noble/ciphers');

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @noble subpath imports (e.g. crypto.js) break on some Windows/Node setups → Metro HTTP 500.
  if (moduleName === '@noble/hashes/crypto.js' || moduleName === '@noble/hashes/crypto') {
    return {
      filePath: path.join(nobleHashesRoot, 'crypto.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('@noble/hashes/')) {
    const sub = moduleName.slice('@noble/hashes/'.length);
    return {
      filePath: path.join(nobleHashesRoot, sub.endsWith('.js') ? sub : `${sub}.js`),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('@noble/ciphers/')) {
    const sub = moduleName.slice('@noble/ciphers/'.length);
    return {
      filePath: path.join(nobleCiphersRoot, sub.endsWith('.js') ? sub : `${sub}.js`),
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
