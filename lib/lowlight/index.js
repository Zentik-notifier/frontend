"use strict";

const low = require("lowlight/lib/core.js");

module.exports = low;

low.registerLanguage("handlebars", require("highlight.js/lib/languages/handlebars"));
low.registerLanguage("javascript", require("highlight.js/lib/languages/javascript"));
