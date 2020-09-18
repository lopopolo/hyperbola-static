"use strict";

const fs = require("fs").promises;
const path = require("path");

const root = path.resolve(__dirname, "..");

const htmlPlugin = (template, filename) =>
  [
    "  new HtmlWebPackPlugin({",
    `    template: "${path.relative(root, template)}",`,
    `    filename: "${filename}",`,
    "    minify: {",
    "      collapseWhitespace: true,",
    "      minifyCSS: true,",
    "      minifyJS: true,",
    "      removeComments: true,",
    "      useShortDoctype: true,",
    "    },",
    "  }),",
  ].join("\n");

module.exports = () => {
  const plugins = [];
  return {
    push(template, filename) {
      plugins.push([template, filename]);
    },

    async writeTo(dest) {
      const out = [
        `const HtmlWebPackPlugin = require("html-webpack-plugin");`,
        "",
        "module.exports = () => [",
      ];

      for (const [template, filename] of plugins) {
        out.push(htmlPlugin(template, filename));
      }
      out.push("];");
      out.push("");

      const pluginContents = out.join("\n");

      await fs.writeFile(dest, pluginContents);
    },
  };
};
