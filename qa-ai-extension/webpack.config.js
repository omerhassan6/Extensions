const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup.js',
    options: './src/options.js',
    background: './src/background.js',
    'content-script': './src/content-script.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/options.html', to: 'options.html' },
        { from: 'src/popup.css', to: 'popup.css' },
        { from: 'src/screenshot-handler.js', to: 'screenshot-handler.js' },
        { from: 'services/**/*', to: '.' }
      ]
    })
  ]
};