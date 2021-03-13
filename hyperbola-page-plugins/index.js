const frontpage = require("./frontpage");
const contact = require("./contact");
const lifestream = require("./lifestream");
const blog = require("./blog");

module.exports = () => [
  ...frontpage(),
  ...contact(),
  ...lifestream(),
  ...blog(),
];
