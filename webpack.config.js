const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const svgToMiniDataURI = require("mini-svg-data-uri");

const hyperbolaPagePlugins = require("./hyperbola-page-plugins");

const buildPlugins = (slice, chunks) => {
  const plugins = [
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
      chunkFilename: "[id].[contenthash].css",
    }),
  ];
  const pages = hyperbolaPagePlugins();
  for (let idx = 0; idx < pages.length; idx += 1) {
    if (idx % chunks === slice) {
      plugins.push(pages[idx]);
    }
  }
  return plugins;
};

module.exports = (env, argv) => {
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

  const slice = parseInt(env.slice);
  const chunks = parseInt(env.chunks);
  const plugins = buildPlugins(slice, chunks);

  return {
    context: path.resolve(__dirname, "src"),
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
          include: [
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/img"),
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/favicons"),
          ],
          exclude: /\.svg$/,
          type: "asset/resource",
          generator: {
            filename: "[name][ext]",
          },
        },
        {
          test: /\.svg$/,
          include: [
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/img"),
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/favicons"),
          ],
          type: "asset/resource",
          use: "@hyperbola/svgo-loader",
          generator: {
            filename: "[name][ext]",
          },
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          exclude: [
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/img"),
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/favicons"),
          ],
          type: "asset",
        },
        {
          test: /\.svg$/,
          exclude: [
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/img"),
            path.resolve(__dirname, "node_modules", "@hyperbola/logo/favicons"),
          ],
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
          include: path.resolve(__dirname, "src", "keys"),
          type: "asset/resource",
          generator: {
            filename: "keys/[name][ext]",
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
          test: /\.html$/,
          include: [
            path.resolve(__dirname, "src", "partials"),
            path.resolve(__dirname, "src", "lifestream", "partials"),
          ],
          use: "html-loader",
        },
        {
          test: /\.md$/,
          use: ["html-loader", path.resolve(__dirname, "loaders/markdown.js")],
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
