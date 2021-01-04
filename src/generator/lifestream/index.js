/* eslint-disable no-console */

const fs = require("fs").promises;
const path = require("path");
const parser = require("js-yaml");

const pluginBuilder = require("../plugin_payload");

const archive = require("./archive");
const assets = require("./assets");
const hashtag = require("./hashtag");
const listing = require("./listing");
const posts = require("./posts");

const ROOT = path.resolve(__dirname, "..", "..", "..");

const loadDB = async () => {
  const posts = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "content",
    "lifestream",
    "posts.yaml"
  );
  const rawDb = await fs.readFile(posts, "utf8");
  const db = parser.load(rawDb, { schema: parser.FAILSAFE_SCHEMA });
  return db;
};

const generator = async () => {
  try {
    const db = await loadDB();
    const webpackPlugins = pluginBuilder();

    // Extract bare hashtags before the database is modified to turn them into
    // links.
    const hashtags = hashtag.get(db);

    // These calls mutate the database.
    posts.prepare(db);
    hashtag.prepare(db);
    assets.prepare(db);

    await hashtag.generate(db, hashtags, webpackPlugins);
    await assets.copy(db);

    const postArchive = archive.get(db);
    await archive.generate(postArchive, webpackPlugins);

    await listing.generate(db, webpackPlugins);

    await posts.generate(db, webpackPlugins);

    const config = path.resolve(ROOT, "webpack.config.lifestream.js");
    await webpackPlugins.writeTo(config);
  } catch (err) {
    return Promise.reject(err);
  }
};

module.exports = generator;
