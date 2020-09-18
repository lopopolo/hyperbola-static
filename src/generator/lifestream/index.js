/* eslint-disable no-console */

const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const parser = require("js-yaml");
const { DateTime } = require("luxon");
const paginate = require("paginate-array");
const pluginBuilder = require("../plugin_payload");

const linkify = require("linkifyjs");
const linkifyHtml = require("linkifyjs/html");
const linkifyHashtag = require("linkifyjs/plugins/hashtag");
linkifyHashtag(linkify);

const PAGE_SIZE = 20;

const templates = Object.freeze({
  archive: path.resolve(__dirname, "archive.html"),
  asset(source) {
    const assetRoot = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "content",
      "lifestream"
    );
    return path.resolve(assetRoot, source);
  },
  index: path.resolve(__dirname, "index.html"),
  post: path.resolve(__dirname, "post.html"),
});

const outputs = Object.freeze({
  root: path.resolve(__dirname, "..", "..", ".."),
  archive: Object.freeze({
    dir: path.resolve(__dirname, "..", "..", "lifestream", "archive"),
    page(year, month, num) {
      return path.resolve(
        this.dir,
        `archive-${year}-${month}-${String(num).padStart(4, "0")}.html`
      );
    },
  }),
  assets: Object.freeze({
    dir: path.resolve(__dirname, "..", "..", "lifestream", "assets"),
    destinationPath(asset) {
      const filename = path.basename(asset);
      return path.resolve(this.dir, filename);
    },
  }),
  index: Object.freeze({
    dir: path.resolve(__dirname, "..", "..", "lifestream", "index"),
    page(num) {
      return path.resolve(
        this.dir,
        `page-${String(num).padStart(4, "0")}.html`
      );
    },
  }),
  partials: Object.freeze({
    dir: path.resolve(__dirname, "..", "..", "lifestream", "partials"),
    archive: path.resolve(
      __dirname,
      "..",
      "..",
      "lifestream",
      "partials",
      "archive.html"
    ),
  }),
  posts: Object.freeze({
    dir: path.resolve(__dirname, "..", "..", "lifestream", "posts"),
    container(id) {
      return path.resolve(this.dir, id);
    },
    page(id) {
      return path.resolve(this.container(id), "index.html");
    },
  }),
});

const Archive = (year, month, pageNum) =>
  Object.freeze({
    templatePath() {
      return outputs.archive.page(year, month, pageNum);
    },
    urlPath() {
      if (pageNum === 1) {
        return `lifestream/archive/${year}/${month}/index.html`;
      }
      const page = String(pageNum);
      return `lifestream/archive/${year}/${month}/page/${page}/index.html`;
    },
  });

const Index = (pageNum) =>
  Object.freeze({
    templatePath() {
      return outputs.index.page(pageNum);
    },
    urlPath() {
      if (pageNum === 1) {
        return "lifestream/index.html";
      }
      return `lifestream/page/${String(pageNum)}/index.html`;
    },
  });

const Post = (id) =>
  Object.freeze({
    templatePath() {
      return outputs.posts.page(id);
    },
    urlPath() {
      return `lifestream/${String(id)}/index.html`;
    },
  });

const buildArchive = (db) => {
  const posts = [...db];
  posts.sort(
    (a, b) =>
      DateTime.fromISO(b.publishDate).valueOf() -
      DateTime.fromISO(a.publishDate).valueOf()
  );

  const aggregates = new Map();
  for (const post of posts) {
    const yearKey = DateTime.fromISO(post.publishDate).setZone("UTC").year;
    const monthKey = DateTime.fromISO(post.publishDate)
      .setZone("UTC")
      .startOf("month")
      .valueOf();
    if (!aggregates.has(yearKey)) {
      aggregates.set(yearKey, new Map());
    }
    const year = aggregates.get(yearKey);
    if (!year.has(monthKey)) {
      year.set(monthKey, []);
    }
    year.get(monthKey).push(post);
  }

  const archive = new Map();
  for (const [year, months] of aggregates) {
    const collected = new Map();
    for (const [month, count] of months) {
      collected.set(DateTime.fromMillis(month).setZone("UTC"), count);
    }
    archive.set(year, collected);
  }
  return archive;
};

const compileArchivePartial = async (db) => {
  try {
    const archive = buildArchive(db);
    const template = await fs.readFile(templates.archive, "utf8");

    const context = { archive };
    const rendered = ejs.render(template, context);

    await fs.mkdir(outputs.partials.dir, { recursive: true });
    await fs.writeFile(outputs.partials.archive, rendered);

    return Promise.resolve("archive");
  } catch (err) {
    return Promise.reject(err);
  }
};

const compilePosts = async (db) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const template = await fs.readFile(templates.post, "utf8");
    await fs.mkdir(outputs.posts.dir, { recursive: true });

    const promises = posts.map(async (post, index, storage) => {
      const context = {
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
          return storage[index - 1] !== undefined;
        },
        older() {
          return this.postAbsoluteUrl(storage[index - 1]);
        },
        hasNewer() {
          return storage[index + 1] !== undefined;
        },
        newer() {
          return this.postAbsoluteUrl(storage[index + 1]);
        },
        posts: [post],
      };

      const rendered = ejs.render(template, context);

      await fs.mkdir(outputs.posts.container(post.id), { recursive: true });
      await fs.writeFile(outputs.posts.page(post.id), rendered);
      return Post(post.id);
    });

    return Promise.all(promises);
  } catch (err) {
    return Promise.reject(err);
  }
};

const compileIndex = async (db, page = 1, pageSize = 20) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const slice = paginate(posts, page, pageSize);
    const context = {
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
        return `/lifestream/page/${next}/`;
      },
      hasNewer() {
        return slice.currentPage > 1;
      },
      newer() {
        const prev = slice.currentPage - 1;
        if (prev < 2) {
          return `/lifestream/`;
        }
        return `/lifestream/page/${prev}/`;
      },
      posts: slice.data,
    };

    const template = await fs.readFile(templates.index, "utf8");

    const rendered = ejs.render(template, context);
    await fs.mkdir(outputs.index.dir, { recursive: true });
    await fs.writeFile(outputs.index.page(page), rendered);

    return Promise.resolve(Index(page));
  } catch (err) {
    return Promise.reject(err);
  }
};

const compileArchiveIndex = async (
  year,
  month,
  db,
  page = 1,
  pageSize = 20
) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const slice = paginate(posts, page, pageSize);
    const context = {
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
        return `/lifestream/archive/${year}/${month}/page/${next}/`;
      },
      hasNewer() {
        return slice.currentPage > 1;
      },
      newer() {
        const prev = slice.currentPage - 1;
        if (prev < 2) {
          return `/lifestream/archive/${year}/${month}/`;
        }
        return `/lifestream/archive/${year}/${month}/page/${prev}/`;
      },
      posts: slice.data,
    };

    const template = await fs.readFile(templates.index, "utf8");

    const rendered = ejs.render(template, context);
    await fs.mkdir(outputs.archive.dir, { recursive: true });
    await fs.writeFile(outputs.archive.page(year, month, page), rendered);

    return Promise.resolve(Archive(year, month, page));
  } catch (err) {
    return Promise.reject(err);
  }
};

const copyAssets = async (db) => {
  try {
    const posts = [...db];

    await fs.mkdir(outputs.assets.dir, { recursive: true });

    for (const post of posts) {
      if (post.image === undefined) {
        continue;
      }

      await fs.copyFile(
        templates.asset(post.image),
        outputs.assets.destinationPath(post.image)
      );
    }
    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
};

const generator = async () => {
  try {
    const rawDb = await fs.readFile(
      path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "content",
        "lifestream",
        "posts.yaml"
      ),
      "utf8"
    );
    const db = parser.safeLoad(rawDb, { schema: parser.FAILSAFE_SCHEMA });

    const webpackPlugins = pluginBuilder();

    await copyAssets(db);

    const hashtags = new Map();

    // Modify the loaded DB to linkify URLs and hashtags.
    for (const post of db) {
      if (post.image) {
        post.image = `../assets/${path.basename(post.image)}`;
      }
      for (const link of linkify.find(post.post)) {
        if (link.type === "hashtag") {
          let hashtag = link.value;
          if (hashtag.startsWith("#")) {
            hashtag = hashtag.slice(1);
          }
          if (!hashtags.has(hashtag)) {
            hashtags.set(hashtag, []);
          }
          const set = hashtags.get(hashtag);
          if (!set.includes(post.id)) {
            set.push(post.id);
          }
          hashtags.set(hashtag, set);
        }
      }
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

    await compileArchivePartial(db);

    // Archive pages
    const archive = buildArchive(db);
    for (const [year, months] of archive) {
      for (const [month, posts] of months) {
        for (let page = 0; page * PAGE_SIZE < posts.length; page += 1) {
          const archive = await compileArchiveIndex(
            year,
            month.toLocaleString({ month: "2-digit" }),
            posts,
            page + 1,
            PAGE_SIZE
          );
          webpackPlugins.push(archive.templatePath(), archive.urlPath());
        }
      }
    }

    // Feed pages
    for (let page = 0; page * PAGE_SIZE < db.length; page += 1) {
      const index = await compileIndex(db, page + 1, PAGE_SIZE);
      webpackPlugins.push(index.templatePath(), index.urlPath());
    }

    // Post pages
    const posts = await compilePosts(db);
    for (const post of posts) {
      webpackPlugins.push(post.templatePath(), post.urlPath());
    }

    const config = path.resolve(outputs.root, "webpack.config.lifestream.js");
    await webpackPlugins.writeTo(config);
  } catch (err) {
    console.error("Error: Unhandled exception");
    console.error(err);
    process.exit(1);
  }
};

module.exports = generator;
