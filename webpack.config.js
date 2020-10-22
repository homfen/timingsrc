const path = require('path');

module.exports = {
  entry: {
    timingsrc: './v3/index.js',
  },
  output: {
    path: path.resolve('./dist'),
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                '@babel/plugin-proposal-export-namespace-from',
                '@babel/plugin-proposal-class-properties',
              ],
            },
          },
        ],
      },
    ],
  },
};
