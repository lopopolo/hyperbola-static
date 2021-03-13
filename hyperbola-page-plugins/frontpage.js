const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = () => [
  new HtmlWebpackPlugin({
    template: "frontpage/index.html",
    filename: "index.html",
  }),
];
