const path = require("path");
const CnameWebpackPlugin = require("cname-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const plugins = [
  new MiniCssExtractPlugin(),
  new CnameWebpackPlugin({
    domain: "hyperbo.la",
  }),
  new HtmlWebPackPlugin({
    template: "homepage/index.html",
    filename: "index.html",
    minify: {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      useShortDoctype: true,
    },
  }),
];

module.exports = {
  context: path.resolve(__dirname, "src"),
  resolve: {
    alias: {
      assets: path.resolve(__dirname, "assets"),
    },
  },
  entry: path.resolve(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
  },
  plugins,
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin(), new OptimizeCSSAssetsPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.s?css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: new RegExp(path.resolve(__dirname, "assets")),
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[ext]",
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif)$/,
        exclude: new RegExp(path.resolve(__dirname, "assets")),
        use: {
          loader: "url-loader",
          options: {
            limit: 8192,
          },
        },
      },
      {
        test: /\.svg$/,
        exclude: new RegExp(path.resolve(__dirname, "assets")),
        use: ["file-loader", "svgo-loader"],
      },
    ],
  },
};
