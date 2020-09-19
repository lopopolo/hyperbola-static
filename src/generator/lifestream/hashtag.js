const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const { DateTime } = require("luxon");
const paginate = require("paginate-array");

const linkify = require("linkifyjs");
const linkifyHtml = require("linkifyjs/html");
const linkifyHashtag = require("linkifyjs/plugins/hashtag");
linkifyHashtag(linkify);

const PAGE_SIZE = 20;

const TEMPLATE = path.resolve(__dirname, "index.html");

const outputs = Object.freeze({
  dir: path.resolve(__dirname, "..", "..", "lifestream", "hashtag"),
  page(hashtag, num) {
    const page = String(num).padStart(4, "0");
    return path.resolve(this.dir, `hashtag-${hashtag}-${page}.html`);
  },
});

const Hashtag = (hashtag, pageNum) =>
  Object.freeze({
    templatePath() {
      return outputs.page(hashtag, pageNum);
    },
    urlPath() {
      if (pageNum === 1) {
        return `lifestream/hashtag/${hashtag}/index.html`;
      }
      const page = String(pageNum);
      return `lifestream/hashtag/${hashtag}/page/${page}/index.html`;
    },
  });

const contextForPage = (hashtag, slice) =>
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
      return slice.currentPage < slice.totalPages;
    },
    older() {
      const next = slice.currentPage + 1;
      return `/lifestream/hashtag/${hashtag}/page/${next}/`;
    },
    hasNewer() {
      return slice.currentPage > 1;
    },
    newer() {
      const prev = slice.currentPage - 1;
      if (prev < 2) {
        return `/lifestream/hashtag/${hashtag}/`;
      }
      return `/lifestream/hashtag/${hashtag}/page/${prev}/`;
    },
    posts: slice.data,
  });

const compile = async (hashtag, db, page = 1, pageSize = PAGE_SIZE) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const slice = paginate(posts, page, pageSize);
    const context = contextForPage(hashtag, slice);

    const template = await fs.readFile(TEMPLATE, "utf8");

    const rendered = ejs.render(template, context);
    await fs.mkdir(outputs.dir, { recursive: true });
    await fs.writeFile(outputs.page(hashtag, page), rendered);

    return Promise.resolve(Hashtag(hashtag, page));
  } catch (err) {
    return Promise.reject(err);
  }
};

const generate = async (db, hashtags, webpackPlugins) => {
  try {
    const promises = [];

    for (const [hashtag, postIds] of hashtags) {
      const posts = [];
      for (const id of postIds) {
        const post = db.find((post) => post.id === id);
        if (post === undefined) {
          return Promise.reject(`missing post: ${id}`);
        }
        posts.push(post);
      }
      for (let page = 0; page * PAGE_SIZE < posts.length; page += 1) {
        const index = compile(hashtag, posts, page + 1);
        promises.push(index);
      }
    }

    const indexes = await Promise.all(promises);
    for (const index of indexes) {
      webpackPlugins.push(index.templatePath(), index.urlPath());
    }

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
};

const get = (db) => {
  const hashtags = new Map();
  const posts = [...db];

  // Modify the loaded DB to linkify URLs and hashtags.
  for (const post of posts) {
    for (const link of linkify.find(post.post)) {
      if (link.type === "hashtag") {
        let hashtag = link.value.toLowerCase();
        // Remove leading `#`.
        hashtag = hashtag.slice(1);

        if (!hashtags.has(hashtag)) {
          hashtags.set(hashtag, new Set());
        }
        const set = hashtags.get(hashtag);
        set.add(post.id);
      }
    }
  }

  return hashtags;
};

const prepare = (db) => {
  // Modify the loaded DB to linkify URLs and hashtags.
  for (const post of db) {
    post.post = linkifyHtml(post.post, {
      className: "",
      defaultProtocol: "https",
      formatHref: {
        hashtag: (value) => {
          let hashtag = value;
          if (hashtag.startsWith("#")) {
            hashtag = hashtag.slice(1);
          }
          return `/lifestream/hashtag/${hashtag}/`;
        },
      },
    });
  }
};

module.exports = {
  compile,
  generate,
  get,
  prepare,
};
