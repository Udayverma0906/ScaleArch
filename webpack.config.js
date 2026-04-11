//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
  mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode',
    // Node.js built-ins — must NOT be bundled, let Node provide them at runtime
    'child_process': 'commonjs child_process',
    'fs':            'commonjs fs',
    'path':          'commonjs path',
    'os':            'commonjs os',
    'crypto':        'commonjs crypto',
    // These packages use dynamic require() internally which causes webpack
    // "Critical dependency" warnings. Marking them external tells webpack
    // not to bundle them — they resolve correctly at runtime in the Extension Host.
    'typescript':                          'commonjs typescript',
    '@typescript-eslint/typescript-estree':'commonjs @typescript-eslint/typescript-estree',
    '@typescript-eslint/project-service':  'commonjs @typescript-eslint/project-service',
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log",
  },
};
module.exports = [ extensionConfig ];