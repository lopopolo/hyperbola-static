const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const hljs = require("highlight.js");
const { definer: terraform } = require("./vendor/terraform");
hljs.registerLanguage("terraform", terraform);

const highlight = (code, lang) => {
  switch (lang) {
    case null:
    case "text":
    case "literal":
    case "nohighlight": {
      return `<pre class="hljs">${code}</pre>`;
    }
    default: {
      const html = hljs.highlight(lang, code).value;
      return `<span class="hljs">${html}</span>`;
    }
  }
};

const blog = require("./webpack.config.blog");
const contact = require("./webpack.config.contact");
const frontpage = require("./webpack.config.frontpage");
const lifestream = require("./webpack.config.lifestream");

const plugins = [
  new MiniCssExtractPlugin({
    filename: "[name].[contenthash].css",
    chunkFilename: "[id].[contenthash].css",
  }),
  ...blog(),
  ...contact(),
  ...frontpage(),
  ...lifestream(),
];

module.exports = (_env, argv) => {
  let cssLoader = "style-loader";
  let optimization = {
    minimize: false,
  };
  if (argv.mode === "production") {
    cssLoader = MiniCssExtractPlugin.loader;
    optimization = {
      minimize: true,
      minimizer: [new TerserPlugin(), new OptimizeCSSAssetsPlugin()],
    };
  }
  return {
    context: path.resolve(__dirname, "src"),
    resolve: {
      alias: {
        assets: path.resolve(__dirname, "assets"),
      },
    },
    entry: path.resolve(__dirname, "src/index.js"),
    output: {
      filename: "[name].[contenthash].js",
      path: path.resolve(__dirname, "dist"),
      publicPath: "/",
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
          use: [cssLoader, "css-loader", "sass-loader"],
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
          test: new RegExp(path.resolve(__dirname, "src", "keys")),
          use: {
            loader: "file-loader",
            options: {
              name: "keys/[name].[ext]",
            },
          },
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          exclude: new RegExp(path.resolve(__dirname, "assets")),
          use: {
            loader: "url-loader",
            options: {
              limit: 8192,
            },
          },
        },
        {
          test: /\.svg$/i,
          exclude: new RegExp(path.resolve(__dirname, "assets")),
          use: ["file-loader", "svgo-loader"],
        },
        {
          test: /resume\.pdf$/,
          use: {
            loader: "file-loader",
            options: {
              name: "contact/resume/lopopolo.pdf",
            },
          },
        },
        {
          test: /\.md$/,
          use: [
            "html-loader",
            {
              loader: "markdown-loader",
              options: {
                langPrefix: "hljs language-",
                highlight,
              },
            },
          ],
        },
        {
          test: /\.ya?ml$/,
          type: "json",
          use: "yaml-loader",
        },
      ],
    },
    plugins,
    optimization,
  };
};
