#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const parser = require("js-yaml");
const moment = require("moment");
const paginate = require("paginate-array");

const linkify = require("linkifyjs");
const linkifyHtml = require("linkifyjs/html");
const linkifyHashtag = require("linkifyjs/plugins/hashtag");
linkifyHashtag(linkify);

const PAGE_SIZE = 20;

function buildArchive(db) {
  const posts = [...db];
  posts.sort(
    (a, b) =>
      moment.parseZone(b.publishDate).valueOf() -
      moment.parseZone(a.publishDate).valueOf()
  );
  const aggregates = new Map();
  for (const post of posts) {
    const yearKey = moment.parseZone(post.publishDate).utc().year();
    const monthKey = moment
      .parseZone(post.publishDate)
      .utc()
      .startOf("month")
      .valueOf();
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
      collected.set(moment.utc(month), count);
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
    const partials = path.resolve(
      __dirname,
      "..",
      "src",
      "lifestream",
      "partials"
    );
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

async function compilePosts(db) {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const template = await fs.readFile(
      path.resolve(__dirname, "post.html"),
      "utf8"
    );
    const base = path.resolve(__dirname, "..", "src", "lifestream", "posts");
    await fs.mkdir(base, { recursive: true });

    const promises = posts.map(async (post, index, storage) => {
      const context = {
        postAbsoluteUrl(item) {
          return `/lifestream/${item.id}/`;
        },
        postDatestamp(item) {
          return moment.parseZone(item.publishDate).utc().format("YYYY-MM-DDTHH:mm:ssZ");
        },
        postDateDisplay(item) {
          return moment.parseZone(item.publishDate).utc().format("HH:mm utc MMM DD YYYY").toLowerCase();
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
      const postBase = path.resolve(base, post.id);
      const out = path.resolve(postBase, "index.html");

      const rendered = ejs.render(template, context);

      await fs.mkdir(postBase, { recursive: true });
      await fs.writeFile(out, rendered);
      return [out, `lifestream/${String(post.id)}/index.html`];
    });

    return Promise.all(promises);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function compileIndex(db, page = 1, pageSize = 20) {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const slice = paginate(posts, page, pageSize);
    const context = {
      postAbsoluteUrl(item) {
        return `/lifestream/${item.id}/`;
      },
      postDatestamp(item) {
        return moment.parseZone(item.publishDate).utc().format("YYYY-MM-DDTHH:mm:ssZ");
      },
      postDateDisplay(item) {
        return moment.parseZone(item.publishDate).utc().format("HH:mm utc MMM DD YYYY").toLowerCase();
      },
      hasOlder() {
        return slice.currentPage < slice.totalPages;
      },
      older() {
        return `/lifestream/page/${slice.currentPage + 1}/`;
      },
      hasNewer() {
        return slice.currentPage > 1;
      },
      newer() {
        return `/lifestream/page/${slice.currentPage - 1}/`;
      },
      posts: slice.data,
    };

    const template = await fs.readFile(
      path.resolve(__dirname, "index.html"),
      "utf8"
    );
    const base = path.resolve(__dirname, "..", "src", "lifestream", "index");
    const out = path.resolve(
      base,
      `page-${String(page).padStart(4, "0")}.html`
    );

    const rendered = ejs.render(template, context);
    await fs.mkdir(base, { recursive: true });
    await fs.writeFile(out, rendered);

    if (page === 1) {
      return Promise.resolve([out, "lifestream/index.html"]);
    }
    return Promise.resolve([out, `lifestream/page/${page}/index.html`]);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function copyAssets(db) {
  try {
    const posts = [...db];

    const base = path.resolve(__dirname, "..", "src", "lifestream", "assets");
    await fs.mkdir(base, { recursive: true });

    for (const post of posts) {
      if (post.image === undefined) {
        continue;
      }
      const filename = path.basename(post.image);
      const out = path.resolve(base, filename);

      const source = path.resolve(__dirname, post.image);

      await fs.copyFile(source, out);
    }
    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function runner() {
  const timer = setInterval(() => {}, 100);
  try {
    const rawDb = await fs.readFile(
      path.resolve(__dirname, "posts.yaml"),
      "utf8"
    );
    const db = parser.safeLoad(rawDb, { schema: parser.FAILSAFE_SCHEMA });

    const out = [
      `const HtmlWebPackPlugin = require("html-webpack-plugin");`,
      "",
      "module.exports = () => [",
    ];

    await copyAssets(db);

    const hashtags = new Map();

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
          hashtag: function(value) {
            let hashtag = value;
            if (hashtag.startsWith("#")) {
              hashtag = hashtag.slice(1);
            }
            return `/lifestream/hashtag/${hashtag}/`;
          }
        },
      });
    }

    await compileArchivePartial(db);

    // Feed pages
    for (let page = 0; page * PAGE_SIZE < db.length; page += 1) {
      const [template, filename] = await compileIndex(db, page + 1, PAGE_SIZE);
      out.push(htmlPlugin(template, filename));
    }

    // Post pages
    const posts = await compilePosts(db);
    for (const [template, filename] of posts) {
      out.push(htmlPlugin(template, filename));
    }

    out.push("];");

    const config = path.resolve(__dirname, "..", "src", "lifestream", "index.js");
    await fs.writeFile(config, out.join("\n"));
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

const htmlPlugin = (template, filename) =>
  [
    "  new HtmlWebPackPlugin({",
    `    template: "${template}",`,
    `    filename: "${filename}",`,
    "    minify: {",
    "      collapseWhitespace: true,",
    "      minifyCSS: true,",
    "      minifyJS: true,",
    "      removeComments: true,",
    "      useShortDoctype: true,",
    "    },",
    "  }),",
  ].join("\n");
