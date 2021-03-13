const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const { DateTime } = require("luxon");

const TEMPLATE = path.resolve(__dirname, "post.html");

const outputs = Object.freeze({
  dir: path.resolve(__dirname, "..", "..", "lifestream", "posts"),
  container(id) {
    return path.resolve(this.dir, id);
  },
  page(id) {
    return path.resolve(this.container(id), "index.html");
  },
});

const Post = (id) =>
  Object.freeze({
    sortKey() {
      return `post-${String(id).padStart(10, "0")}`;
    },
    templatePath() {
      return outputs.page(id);
    },
    urlPath() {
      return `lifestream/${String(id)}/index.html`;
    },
  });

const contextForPage = (db, index) =>
  Object.freeze({
    postAbsoluteUrl(item) {
      return `/lifestream/${item.id}/`;
    },
    postDatestamp(item) {
      return DateTime.fromISO(item.publishDate).setZone("UTC").toISO();
    },
    postDateDisplay(item) {
      return DateTime.fromISO(item.publishDate)
        .setZone("UTC")
        .toLocaleString(DateTime.DATETIME_FULL);
    },
    hasOlder() {
      return db[index - 1] !== undefined;
    },
    older() {
      return this.postAbsoluteUrl(db[index - 1]);
    },
    hasNewer() {
      return db[index + 1] !== undefined;
    },
    newer() {
      return this.postAbsoluteUrl(db[index + 1]);
    },
    canonicalUrl() {
      const post = db[index];
      return `https://hyperbo.la/lifestream/${post.id}/`;
    },
    title() {
      const post = db[index];
      return `hyperbo.la :: lifestream :: post #${post.id}`;
    },
    description() {
      const post = db[index];
      return `hyperbo.la: Ryan Lopopolo's lifestream post #${post.id}`;
    },
    post: db[index],
  });

const compile = async (db, post, index, template) => {
  try {
    const context = contextForPage(db, index);

    const rendered = ejs.render(template, context);

    await fs.mkdir(outputs.container(post.id), { recursive: true });
    await fs.writeFile(outputs.page(post.id), rendered);
    return Promise.resolve(Post(post.id));
  } catch (err) {
    return Promise.reject(err);
  }
};

const generate = async (db, webpackPlugins) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const template = await fs.readFile(TEMPLATE, "utf8");
    await fs.mkdir(outputs.dir, { recursive: true });

    const promises = posts.map(async (post, index, storage) =>
      compile(storage, post, index, template)
    );

    const gen = await Promise.all(promises);
    const sortedGen = gen.sort((a, b) => {
      if (a.sortKey() < b.sortKey()) {
        return -1;
      } else {
        return 1;
      }
    });
    for (const post of sortedGen) {
      webpackPlugins.push(post.templatePath(), post.urlPath());
    }

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
};

const prepare = (db) => {
  // Modify the loaded DB to escape HTML special characters.
  for (const post of db) {
    post.post = post.post.replace("<", "&lt;").replace(">", "&gt;");
  }
};

module.exports = {
  generate,
  prepare,
};
