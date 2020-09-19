const fs = require("fs").promises;
const path = require("path");

const outputs = Object.freeze({
  dir: path.resolve(__dirname, "..", "..", "lifestream", "assets"),
  destinationPath(asset) {
    const filename = path.basename(asset);
    return path.resolve(this.dir, filename);
  },
});

const resolve = (source) => {
  const asset = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "content",
    "lifestream",
    "images",
    path.basename(source)
  );
  return asset;
};

const copy = async (db) => {
  try {
    const posts = [...db];

    await fs.mkdir(outputs.dir, { recursive: true });

    const imagePosts = [];
    for (const post of posts) {
      if (post.image !== undefined) {
        imagePosts.push(post);
      }
    }

    const promises = imagePosts.map(async (post) => {
      const source = resolve(post.image);
      const destination = outputs.destinationPath(post.image);
      await fs.copyFile(source, destination);

      Promise.resolve(true);
    });
    await Promise.all(promises);

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
};

const prepare = (db) => {
  // Modify the loaded DB to re-point images at their generated locations.
  for (const post of db) {
    if (post.image) {
      post.image = `../assets/${path.basename(post.image)}`;
    }
  }
};

module.exports = {
  copy,
  prepare,
};
