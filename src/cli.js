"use strict";

/* eslint-disable no-console */

const { program } = require("commander");
const { version } = require("../package.json");
const blogGenerator = require("./generator/blog");

const site = async () => {
  await blogGenerator();
};

const blog = async () => {
  await blogGenerator();
};

const main = async () => {
  const timer = setInterval(() => {}, 100);
  try {
    program
      .version(version)
      .description("Static site generator for hyperbo.la.");
    program
      .command("site")
      .description("Generate the full site and static assets for hyperbo.la/")
      .action(blog);
    program
      .command("blog")
      .description("Generate blog posts and static assets for hyperbo.la/w/")
      .action(blog);
    await program.parseAsync(process.argv);
  } catch (err) {
    console.error("Error: Unhandled exception");
    console.error(err);
    process.exit(1);
  } finally {
    timer.unref();
  }
};

module.exports = main;
