#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const frontMatter = require("front-matter");
const moment = require("moment");
const HtmlWebPackPlugin = require("html-webpack-plugin");

const blogPosts = Object.freeze([
  "synthesis",
  "cactus-harvesting",
  "the-conjoined-villages",
  "sprint-log-2019-03-08",
  "nemawashi",
  "reflections-on-learning-rust",
  "social-coding-2018",
  "secrets-in-parameter-store-postmortem",
  "terraform-blue-green",
  "aws-org-chart",
  "engineering-finance-partnership",
]);

async function walk(dir) {
  try {
    const files = await fs.readdir(dir);
    const children = files.map(async (file) => {
      try {
        const filepath = path.join(dir, file);
        const stats = await fs.stat(filepath);
        if (stats.isDirectory()) {
          return walk(filepath);
        }
        if (stats.isFile()) {
          return Promise.resolve(filepath);
        }
        return Promise.reject(filepath);
      } catch (err) {
        return Promise.reject(err);
      }
    });
    return Promise.all(children).then((dirEntries) =>
      dirEntries.flat(Infinity).filter((entry) => entry != null)
    );
  } catch (err) {
    return Promise.reject(err);
  }
}

async function parsePost(slug) {
  try {
    const data = await fs.readFile(
      path.resolve(__dirname, "posts", slug, "post.md"),
      "utf8"
    );
    return frontMatter(data);
  } catch (err) {
    return Promise.reject(err);
  }
}

function extractTemplateParams(slug, data) {
  console.log(slug, data);
  const date = moment(data.publishDate);
  const post = Object.create(null);
  post.title = data.title;
  post.absoluteUrl = `/w/${slug}/`;
  post.datestamp = date.format("YYYY-MM-DD");
  post.publishDate = date.format("MMMM DD, YYYY");
  post.summary = data.summary;
  post.markdown = "./post.md";
  const context = Object.create(null);
  context.post = Object.freeze(post);
  return Object.freeze(context);
}

async function compilePost(slug) {
  try {
    const data = await parsePost(slug);
    const template = await fs.readFile(
      path.resolve(__dirname, "template.html"),
      "utf8"
    );
    const post = path.resolve(__dirname, "..", "src", "blog", "posts", slug);
    const markdown = path.resolve(post, "post.md");
    const out = path.resolve(post, "index.html");

    const context = extractTemplateParams(slug, data.attributes);
    const rendered = ejs.render(template, context);

    await fs.mkdir(post, { recursive: true });
    await fs.writeFile(markdown, data.body);
    await fs.writeFile(out, rendered);
    await copyPostAssets(slug);

    return Promise.resolve(slug);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function copyPostAssets(slug) {
  try {
    const assetsDir = path.resolve(__dirname, "posts", slug, "assets");
    let assets;
    try {
      assets = await walk(assetsDir);
    } catch (err) {
      console.log(err);
      return Promise.resolve(slug);
    }
    return Promise.all(
      assets.map(async (asset) => {
        const assetOut = path.resolve(
          __dirname,
          "..",
          "src",
          "blog",
          "posts",
          slug,
          path.relative(assetsDir, asset)
        );
        console.log(assetOut);
        await fs.copyFile(asset, assetOut);
        return Promise.resolve(slug);
      })
    );
  } catch (err) {
    return Promise.reject(err);
  }
}

async function compileIndex(posts) {
  try {
    const postMetadata = await Promise.all(
      posts.map(async (slug) => {
        const data = await parsePost(slug);
        return Promise.resolve([slug, data]);
      })
    );

    const template = await fs.readFile(
      path.resolve(__dirname, "index.html"),
      "utf8"
    );
    const index = path.resolve(__dirname, "..", "src", "blog", "index");
    const out = path.resolve(index, "index.html");

    const context = postMetadata.map(
      ([slug, data]) => extractTemplateParams(slug, data.attributes).post
    );
    const rendered = ejs.render(template, { posts: context });

    await fs.mkdir(index, { recursive: true });
    await fs.writeFile(out, rendered);

    return Promise.resolve(posts);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function runner() {
  const timer = setInterval(() => {}, 100);
  try {
    await Promise.all(blogPosts.map(compilePost));
    await compileIndex(blogPosts);
  } catch (err) {
    console.error("Error: Unhandled exception");
    console.error(err);
    process.exit(1);
  } finally {
    timer.unref();
  }
}

if (require.main === module) {
  runner();
}

module.exports = () => [
  new HtmlWebPackPlugin({
    template: "blog/index/index.html",
    filename: "w/index.html",
    posts: blogPosts,
    minify: {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      useShortDoctype: true,
    },
  }),
  ...blogPosts.map(
    (slug) =>
      new HtmlWebPackPlugin({
        template: `blog/posts/${slug}/index.html`,
        filename: `w/${slug}/index.html`,
        minify: {
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
          removeComments: true,
          useShortDoctype: true,
        },
      })
  ),
];
