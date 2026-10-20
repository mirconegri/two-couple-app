module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo wires the Reanimated worklets plugin automatically
    // when the package is present, so no extra plugin entry is required.
    presets: ['babel-preset-expo'],
  };
};
