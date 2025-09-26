module.exports = function (api) {
  api.cache(true);
  return {
    // Use Expo's preset so Metro can parse TS/Flow and dynamic import
    presets: ['babel-preset-expo'],
    // Babel plugins (worklets plugin must be last)
    plugins: [
      'react-native-worklets/plugin',
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.flow'],
        alias: {
          '^react-native$': 'react-native-web' // for web compatibility
        }
      }]
    ],
    // Keep Node-friendly transforms during Jest runs
    env: {
      test: {
        presets: [
          ['@babel/preset-env', {
            targets: { node: 'current' },
            modules: 'commonjs'
          }],
          'babel-preset-expo'
        ],
        plugins: [
          ['@babel/plugin-transform-modules-commonjs', {
            importInterop: 'node'
          }],
          ['module-resolver', {
            root: ['./src'],
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.flow'],
            alias: {
              '^react-native$': 'react-native-web' // for web compatibility
            }
          }],
          ['@babel/plugin-transform-flow-strip-types']
        ]
      },
    },
  };
};
