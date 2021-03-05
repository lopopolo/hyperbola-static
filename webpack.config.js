const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const svgToMiniDataURI = require("mini-svg-data-uri");

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

const buildPlugins = () => {
  const plugins = [
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
      chunkFilename: "[id].[contenthash].css",
    }),
  ];
  return [...plugins, ...blog(), ...contact(), ...frontpage(), ...lifestream()];
};

module.exports = (_env, argv) => {
  let cssLoader = "style-loader";
  let optimization = {
    minimize: false,
    chunkIds: "deterministic",
    moduleIds: "deterministic",
  };
  if (argv.mode === "production") {
    cssLoader = MiniCssExtractPlugin.loader;
    optimization.minimize = true;
    optimization.minimizer = ["...", new CssMinimizerPlugin()];
  }

  const plugins = buildPlugins();

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
          test: /\.s?css$/,
          use: [cssLoader, "css-loader", "sass-loader"],
        },
        {
          include: path.resolve(__dirname, "assets"),
          exclude: /\.svg$/,
          type: "asset/resource",
          generator: {
            filename: "[name][ext]",
          },
        },
        {
          test: /\.svg$/,
          include: path.resolve(__dirname, "assets"),
          type: "asset/resource",
          use: "@hyperbola/svgo-loader",
          generator: {
            filename: "[name][ext]",
          },
        },
        {
          include: path.resolve(__dirname, "src", "keys"),
          type: "asset/resource",
          generator: {
            filename: "keys/[name][ext]",
          },
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          exclude: path.resolve(__dirname, "assets"),
          type: "asset",
        },
        {
          test: /\.svg$/,
          exclude: path.resolve(__dirname, "assets"),
          type: "asset",
          use: "@hyperbola/svgo-loader",
          generator: {
            dataUrl: (content) => {
              content = content.toString();
              return svgToMiniDataURI(content);
            },
          },
        },
        {
          test: /resume\.pdf$/,
          type: "asset/resource",
          generator: {
            filename: "contact/resume/lopopolo.pdf",
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
      ],
    },
    plugins,
    optimization,
    devServer: {
      compress: true,
      host: "127.0.0.1",
      port: 13777,
    },
  };
};
