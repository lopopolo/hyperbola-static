#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const parser = require("js-yaml");
const moment = require("moment");
const paginate = require("paginate-array");
const HtmlWebPackPlugin = require("html-webpack-plugin");

function buildArchive(db) {
  const posts = [...db];
  posts.sort((a, b) => moment(a.publishDate).isSameOrBefore(moment(b.publishDate)));
  const aggregates = new Map();
  for (const post of posts) {
    const yearKey = moment(post.publishDate).year();
    const monthKey = moment(post.publishDate).startOf("month").valueOf();
    if (!aggregates.has(yearKey)) {
      aggregates.set(yearKey, new Map());
    }
    const year = aggregates.get(yearKey);
    if (!year.has(monthKey)) {
      year.set(monthKey, 0);
    }
    year.set(monthKey, 1 + year.get(monthKey));
  }
  const archive = new Map();
  for (const [year, months] of aggregates) {
    const collected = new Map();
    for (const [month, count] of months) {
      collected.set(moment(month), count);
    }
    archive.set(year, collected);
  }
  return archive;
}

async function compileArchivePartial(db) {
  try {
    const archive = buildArchive(db);
    const template = await fs.readFile(
      path.resolve(__dirname, "archive.html"),
      "utf8"
    );
    const partials = path.resolve(__dirname, "..", "src", "lifestream", "posts", "partials");
    const out = path.resolve(partials, "archive.html");
    console.log(out);

    const context = { archive };
    const rendered = ejs.render(template, context);

    await fs.mkdir(partials, { recursive: true });
    await fs.writeFile(out, rendered);

    return Promise.resolve("archive");
  } catch (err) {
    return Promise.reject(err);
  }
}

async function compilePost(post) {
  try {
    const template = await fs.readFile(
      path.resolve(__dirname, "template.html"),
      "utf8"
    );
    const posts = path.resolve(__dirname, "..", "src", "blog", "posts", post.id);
    const out = path.resolve(posts, "index.html");
    console.log(out);

    const context = post;
    const rendered = ejs.render(template, context);

    await fs.mkdir(posts, { recursive: true });
    await fs.writeFile(out, rendered);

    return Promise.resolve(post.id);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function compileIndex(db, page = 1, pageSize = 20) {
  try {
    const posts = [...db];
    posts.reverse();
    const slice = paginate(posts, page, pageSize);
    const context = {
      hasPrevious: slice.currentPage > 1 && slice.currentPage <= slice.totalPages,
      previous: slice.currentPage - 1,
      hasNext: slice.currentPage >= 1 && slice.currentPage < slice.totalPages,
      next: slice.currentPage + 1,
      posts: slice.data,
    };

    const template = await fs.readFile(
      path.resolve(__dirname, "index.html"),
      "utf8"
    );
    const indexes = path.resolve(__dirname, "..", "src", "lifestream/index/");
    const out = path.resolve(indexes, `page-${String(page).padStart(4, "0")}.html`);

    const rendered = ejs.render(template, context);
    await fs.mkdir(indexes, { recursive: true });
    await fs.writeFile(out, rendered);

    return Promise.resolve(`lifestream/index/page-${String(page).padStart(4, "0")}.html`);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function runner() {
  const timer = setInterval(() => {}, 100);
  try {
    const rawDb = await fs.readFile(path.resolve(__dirname, "posts.yaml"), "utf8");
    const db = parser.safeLoad(rawDb, { schema: parser.FAILSAFE_SCHEMA });
    await compileArchivePartial(db);
    await compileIndex(db);
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

module.exports = [
  new HtmlWebPackPlugin({
    template: "lifestream/index/page-0001.html",
    filename: "lifestream/index.html",
    minify: {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      useShortDoctype: true,
    },
  }),
];
