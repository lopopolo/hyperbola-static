/* eslint-disable no-console */

const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const frontMatter = require("front-matter");
const { DateTime } = require("luxon");
const pluginBuilder = require("../plugin_payload");

const root = path.resolve(__dirname, "..", "..", "..");
const contentRoot = path.resolve(root, "content");
const assetsDir = (slug) => path.resolve(contentRoot, "blog", slug, "assets");
const markdownPath = (slug) =>
  path.resolve(contentRoot, "blog", slug, "post.md");

const blogPosts = Object.freeze([
  "source-level-polymorphism",
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

const walk = async (dir) => {
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
    const listing = Promise.all(children);
    return listing.then((entries) => entries.flat(Infinity));
  } catch (err) {
    return Promise.reject(err);
  }
};

const parsePost = async (slug) => {
  try {
    const markdown = markdownPath(slug);
    const data = await fs.readFile(markdown, "utf8");
    return frontMatter(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

const extractTemplateParams = (slug, data) => {
  console.log(slug, data);
  const date = DateTime.fromISO(data.publishDate);
  const post = Object.create(null);
  post.title = data.title;
  post.absoluteUrl = `/w/${slug}/`;
  post.datestamp = date.toISO();
  post.publishDate = date.toLocaleString(DateTime.DATE_FULL);
  post.summary = data.summary;
  post.markdown = "./post.md";
  const context = Object.create(null);
  context.post = Object.freeze(post);
  return Object.freeze(context);
};

const compilePost = async (slug) => {
  try {
    const data = await parsePost(slug);
    const template = await fs.readFile(
      path.resolve(__dirname, "template.html"),
      "utf8"
    );
    const post = path.resolve(__dirname, "..", "..", "blog", "posts", slug);
    const out = Object.freeze({
      markdown: path.resolve(post, "post.md"),
      html: path.resolve(post, "index.html"),
    });

    const context = extractTemplateParams(slug, data.attributes);
    const rendered = ejs.render(template, context);

    await fs.mkdir(post, { recursive: true });
    await fs.writeFile(out.markdown, data.body);
    await fs.writeFile(out.html, rendered);
    await copyPostAssets(slug);

    return Promise.resolve(slug);
  } catch (err) {
    return Promise.reject(err);
  }
};

const copyPostAssets = async (slug) => {
  let assets;
  try {
    assets = await walk(assetsDir(slug));
  } catch (err) {
    // Not all posts have assets
    console.log(err);
    return Promise.resolve(slug);
  }
  try {
    const copies = assets.map(async (asset) => {
      const assetOut = path.resolve(
        __dirname,
        "..",
        "..",
        "blog",
        "posts",
        slug,
        path.relative(assetsDir(slug), asset)
      );
      console.log(assetOut);
      await fs.copyFile(asset, assetOut);

      return Promise.resolve(slug);
    });
    return Promise.all(copies);
  } catch (err) {
    return Promise.reject(err);
  }
};

const compileIndex = async (posts) => {
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
    const index = path.resolve(__dirname, "..", "..", "blog", "index");
    const out = Object.freeze({
      html: path.resolve(index, "index.html"),
    });

    const context = postMetadata.map(
      ([slug, data]) => extractTemplateParams(slug, data.attributes).post
    );
    const rendered = ejs.render(template, { posts: context });

    await fs.mkdir(index, { recursive: true });
    await fs.writeFile(out.html, rendered);

    return Promise.resolve(posts);
  } catch (err) {
    return Promise.reject(err);
  }
};

const webpackPlugins = async (posts) => {
  try {
    const webpackPlugins = pluginBuilder();
    webpackPlugins.push(
      path.resolve(root, "src", "blog/index/index.html"),
      "w/index.html"
    );

    for (const slug of posts) {
      const template = path.resolve(
        root,
        "src",
        `blog/posts/${slug}/index.html`
      );
      const filename = `w/${slug}/index.html`;
      webpackPlugins.push(template, filename);
    }

    const config = path.resolve(root, "hyperbola-page-plugins", "blog.js");
    await webpackPlugins.writeTo(config);

    return Promise.resolve(posts);
  } catch (err) {
    return Promise.reject(err);
  }
};

const generate = async () => {
  const posts = blogPosts.map(compilePost);
  await Promise.all(posts);
  await compileIndex(blogPosts);
  await webpackPlugins(blogPosts);
};

module.exports = generate;
