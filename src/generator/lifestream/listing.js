const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const { DateTime } = require("luxon");
const paginate = require("paginate-array");

const PAGE_SIZE = 20;
const TEMPLATE = path.resolve(__dirname, "index.html");

const outputs = Object.freeze({
  dir: path.resolve(__dirname, "..", "..", "lifestream", "index"),
  page(num) {
    return path.resolve(this.dir, `page-${String(num).padStart(4, "0")}.html`);
  },
});

const Index = (pageNum) =>
  Object.freeze({
    templatePath() {
      return outputs.page(pageNum);
    },
    urlPath() {
      if (pageNum === 1) {
        return "lifestream/index.html";
      }
      return `lifestream/page/${String(pageNum)}/index.html`;
    },
  });

const contextForPage = (slice) =>
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
    canonicalUrl() {
      if (slice.currentPage === 1) {
        return `https://hyperbo.la/lifestream/`;
      }
      return `https://hyperbo.la/lifestream/page/${slice.currentPage}/`;
    },
    title() {
      return `hyperbo.la :: lifestream :: posts :: page ${slice.currentPage}`;
    },
    description() {
      return `hyperbo.la: Ryan Lopopolo's lifestream posts page ${slice.currentPage}`;
    },
    posts: slice.data,
  });

const compile = async (db, page = 1, pageSize = PAGE_SIZE) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const slice = paginate(posts, page, pageSize);
    const context = contextForPage(slice);

    const template = await fs.readFile(TEMPLATE, "utf8");

    const rendered = ejs.render(template, context);
    await fs.mkdir(outputs.dir, { recursive: true });
    await fs.writeFile(outputs.page(page), rendered);

    return Promise.resolve(Index(page));
  } catch (err) {
    return Promise.reject(err);
  }
};

const generate = async (db, webpackPlugins) => {
  try {
    const promises = [];
    // Feed pages
    for (let page = 0; page * PAGE_SIZE < db.length; page += 1) {
      const index = compile(db, page + 1, PAGE_SIZE);
      promises.push(index);
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

module.exports = {
  generate,
};
