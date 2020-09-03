const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Soy2JsPlugin = require('./soy2js');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CopyHelpers = require('./copyHelpers');

const config = {
  devServer: {
    publicPath: '/',
    port: 9028
  },
  entry: {
    'Header/Header': path.join(__dirname, '../modules/Header/Header.js'),
    'Footer/Footer': path.join(__dirname, '../modules/Footer/Footer.js')
  },
  output: {
    path: path.resolve(__dirname, '../../dist'),
    publicPath: ''
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          /node_modules/
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-object-rest-spread']
          }
        }
      },
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader, // Extracts CSS to separate file instead of bundling into JS
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.html$/,
        use: ['html-loader?interpolate']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new Soy2JsPlugin(), // Custom plugin to compile Soy into Soy2JS on file change
    new ExtraWatchWebpackPlugin({
      files: ['modules/**/*.soy'] // Adds Soy files to webpack watch list
    }),
    new CopyWebpackPlugin([
      {
        from: 'modules/**/*.json',
        to: '[name]/[name].json'
      },
      {
        from: 'modules/**/*.soy',
        to: '[name]/[name].soy',
        transform: CopyHelpers.transformSoy // Strips params and template tags from Soy files
      },
      {
        from: 'themes/theme.scss',
        to: 'themes/theme.scss',
        transform: CopyHelpers.addBootstrapImport // Adds a bootstrap import to top of theme file
      },
      {
        from: 'themes/theme.jsonc',
        to: 'themes/theme.json',
        transform: CopyHelpers.stripJsonComments
      }
    ])
  ],
  resolve: {
    alias: {
      "js": path.resolve(__dirname, '../js/'),
      "node_modules": path.resolve(__dirname, '../node_modules/'),
      ".tmp": path.resolve(__dirname, '../.tmp/')
    }
  }
};

module.exports = (env, argv) => {
  // Adds the local testing files when in development mode
  if (argv.mode === 'development') {
    config.entry = {
      local_testing: path.join(__dirname, '../local_testing/local_testing.js'),
      ...config.entry
    }

    config.plugins.push(
      new HtmlWebpackPlugin({
        template: 'local_testing/local_testing.html'
      })
    );
  }
  return config;
}
