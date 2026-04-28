//@ts-check
'use strict';
const path = require('path');
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
    vscode:          'commonjs vscode',
    'child_process': 'commonjs child_process',
    'fs':            'commonjs fs',
    'path':          'commonjs path',
    'os':            'commonjs os',
    'crypto':        'commonjs crypto',
    // ── tree-sitter native .node binaries CANNOT be bundled by webpack.
    // Must be external + shipped in node_modules via .vscodeignore exceptions.
    'tree-sitter':      'commonjs tree-sitter',
    'tree-sitter-java': 'commonjs tree-sitter-java',
    // NOTE: @typescript-eslint and typescript are NOT external anymore —
    // webpack bundles them so they work in both dev and published extension.
  },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [{ test: /\.ts$/, exclude: /node_modules/, use: [{ loader: 'ts-loader' }] }]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: { level: "log" },
};
module.exports = [ extensionConfig ];