const { getDefaultConfig } = require('expo/metro-config');

/**
 * Keep Expo defaults. Do NOT return raw `filePath` from a custom resolveRequest for
 * @noble/* — that breaks Metro SHA-1 on Windows/OneDrive and yields HTTP 500.
 */
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
