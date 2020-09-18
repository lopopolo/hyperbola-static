const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = () => [
  new HtmlWebPackPlugin({
    template: "contact/index.html",
    filename: "contact/index.html",
    minify: {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      useShortDoctype: true,
    },
  }),
];
