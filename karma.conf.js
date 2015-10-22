var webpack = require('webpack');

module.exports = function(config) {
  config.set({
    basePath: '',
    browsers: ['PhantomJS'],
    files: [
      'tests.webpack.js'
    ],
    port: 8080,
    captureTimeout: 60000,
    frameworks: ['phantomjs-shim', 'mocha', 'chai'],
    client: {
      mocha: {}
    },
    singleRun: true,
    reporters: ['mocha'],
    preprocessors: {
      'tests.webpack.js': ['webpack', 'sourcemap']
    },
    webpack: {
      devtool: 'inline-source-map',
      module: {
        loaders: [
          { test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel' }
        ]
      },
      resolve: {
        extensions: ['', '.js', '.jsx']
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': '"test"'
        })
      ]
    },
    webpackServer: {
      noInfo: true
    }
  });
};
