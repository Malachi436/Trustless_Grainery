module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        lazyImports: true
      }]
    ],
    plugins: [
      ['module-resolver', {
        root: ['./src'],
        alias: {
          '@': './src'
        }
      }],
      'nativewind/babel',
      'react-native-reanimated/plugin'
    ]
  };
};
