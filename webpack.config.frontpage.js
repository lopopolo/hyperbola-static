const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = () => [
  new HtmlWebPackPlugin({
    template: "frontpage/index.html",
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
