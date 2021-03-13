const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const { DateTime } = require("luxon");
const paginate = require("paginate-array");

const PAGE_SIZE = 20;
const INDEX_TEMPLATE = path.resolve(__dirname, "index.html");
const SIDEBAR_TEMPLATE = path.resolve(__dirname, "archive.html");

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
});

const Archive = (year, month, pageNum) =>
  Object.freeze({
    sortKey() {
      return `${year}-${month}-${pageNum}`;
    },
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

const contextForPage = (year, month, slice) =>
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
    canonicalUrl() {
      if (slice.currentPage === 1) {
        return `https://hyperbo.la/lifestream/archive/${year}/${month}/`;
      }
      return `https://hyperbo.la/lifestream/archive/${year}/${month}/page/${slice.currentPage}/`;
    },
    title() {
      const months = {
        [1]: 'January',
        [2]: 'February',
        [3]: 'March',
        [4]: 'April',
        [5]: 'May',
        [6]: 'June',
        [7]: 'July',
        [8]: 'August',
        [9]: 'September',
        [10]: 'October',
        [11]: 'November',
        [12]: 'December',
      };
      if (slice.currentPage === 1) {
        return `hyperbo.la :: lifestream :: ${months[month]} ${year} archive`;
      }
      return `hyperbo.la :: lifestream :: ${months[month]} ${year} :: page ${slice.currentPage}`;
    },
    description() {
      const months = {
        [1]: 'January',
        [2]: 'February',
        [3]: 'March',
        [4]: 'April',
        [5]: 'May',
        [6]: 'June',
        [7]: 'July',
        [8]: 'August',
        [9]: 'September',
        [10]: 'October',
        [11]: 'November',
        [12]: 'December',
      };
      return `hyperbo.la: Ryan Lopopolo's lifestream archive for ${months[month]} ${year} page ${slice.currentPage}`;
    },
    posts: slice.data,
  });

const compileSidebarPartial = async (archive) => {
  try {
    const template = await fs.readFile(SIDEBAR_TEMPLATE, "utf8");

    const context = { archive };
    const rendered = ejs.render(template, context);

    await fs.mkdir(outputs.partials.dir, { recursive: true });
    await fs.writeFile(outputs.partials.archive, rendered);

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
};

const compileMonthIndexes = async (
  year,
  month,
  db,
  page = 1,
  pageSize = PAGE_SIZE
) => {
  try {
    const posts = [...db];
    posts.sort((a, b) => b.id - a.id); // decending post ID order

    const slice = paginate(posts, page, pageSize);
    const context = contextForPage(month, year, slice);

    const template = await fs.readFile(INDEX_TEMPLATE, "utf8");

    const rendered = ejs.render(template, context);
    await fs.mkdir(outputs.archive.dir, { recursive: true });
    await fs.writeFile(outputs.archive.page(year, month, page), rendered);

    return Promise.resolve(Archive(year, month, page));
  } catch (err) {
    return Promise.reject(err);
  }
};

const get = (db) => {
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

const generate = async (archive, webpackPlugins) => {
  try {
    await compileSidebarPartial(archive);

    const promises = [];

    // Archive pages
    for (const [year, months] of archive) {
      for (const [month, posts] of months) {
        for (let page = 0; page * PAGE_SIZE < posts.length; page += 1) {
          const archive = compileMonthIndexes(
            year,
            month.toLocaleString({ month: "2-digit" }),
            posts,
            page + 1,
            PAGE_SIZE
          );
          promises.push(archive);
        }
      }
    }

    const archives = await Promise.all(promises);
    const sortedArchives = archives.sort((a, b) => {
      if (a.sortKey() < b.sortKey()) {
        return -1;
      } else {
        return 1;
      }
    });
    for (const archive of sortedArchives) {
      webpackPlugins.push(archive.templatePath(), archive.urlPath());
    }

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
};

module.exports = {
  generate,
  get,
};
