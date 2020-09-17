"use strict";

/* eslint-disable no-console */

const blogGenerator = require("./generator/blog");

const main = async () => {
  const timer = setInterval(() => {}, 100);
  try {
    await blogGenerator();
  } catch (err) {
    console.error("Error: Unhandled exception");
    console.error(err);
    process.exit(1);
  } finally {
    timer.unref();
  }
};

module.exports = main;
