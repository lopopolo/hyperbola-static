const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = () => [
  new HtmlWebpackPlugin({
    template: "contact/index.html",
    filename: "contact/index.html",
  }),
];
