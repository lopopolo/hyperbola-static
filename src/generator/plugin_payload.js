"use strict";

const fs = require("fs").promises;
const path = require("path");

const root = path.resolve(__dirname, "..");

const htmlPlugin = (template, filename) =>
  [
    "  new HtmlWebpackPlugin({",
    `    template: "${path.relative(root, template)}",`,
    `    filename: "${filename}",`,
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
        `const HtmlWebpackPlugin = require("html-webpack-plugin");`,
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
