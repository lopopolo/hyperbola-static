const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = () => [
  new HtmlWebPackPlugin({
    template: "frontpage/index.html",
    filename: "index.html",
  }),
];
