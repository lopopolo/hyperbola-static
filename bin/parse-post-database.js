#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const database = require("../content/source/hyperbola-app-2020-09-20T0049Z.json");
const output = path.resolve(
  __dirname,
  "..",
  "content",
  "lifestream",
  "posts.yaml"
);

const lifestreams = [];

for (const model of database) {
  if (model.model === "lifestream.lifestreamitem") {
    const serialized = {
      id: model.pk,
      publishDate: model.fields.pub_date,
      post: model.fields.blurb,
    };
    lifestreams.push(serialized);
  }
}

for (const model of database) {
  if (model.model === "lifestream.lifestreampicture") {
    const serialized = lifestreams.find((post) => post.id === model.pk);
    if (serialized === undefined) {
      throw new Error(`Mismatched lifestream picture with pk = ${model.pk}`);
    }
    serialized.image = model.fields.picture
      .replace("lifestream/", "images/")
      .toLowerCase();
  }
}

lifestreams.sort((a, b) => a.id - b.id);

const yaml = ["---"];

for (const post of lifestreams) {
  yaml.push(`- id: ${post.id}`);
  yaml.push(`  publishDate: "${post.publishDate}"`);
  if (post.image !== undefined) {
    yaml.push(`  image: "${post.image}"`);
  }
  yaml.push("  post: >-");
  yaml.push(`    ${post.post}`);
}

yaml.push("");

fs.writeFileSync(output, yaml.join("\n"));
