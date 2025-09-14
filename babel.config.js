module.exports = function (api) {
  api.cache(true);
  return {
    // Use Expo's preset so Metro can parse TS/Flow and dynamic import
    presets: ['babel-preset-expo'],
    // Keep Node-friendly transforms during Jest runs
    env: {
      test: {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { node: 'current' },
            },
          ],
        ],
      },
    },
  };
};
