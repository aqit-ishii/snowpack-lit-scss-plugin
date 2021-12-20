"use strict";
const { processString } = require('uglifycss');
const { dirname, join } = require('path');
const sass = require('node-sass');
const fsSync = require("fs");
const path = require("path");
const glob = require("glob");
const proxyImportResolver = (source) => {
  return source.replace(/(?:import)\s*['"].*\.\w+\.css\.js['"];/g, "");
};

const illegalChars = new Map();
illegalChars.set('\\', '\\\\');
illegalChars.set('`', '\\`');
illegalChars.set('$', '\\$');

const stringToTemplateLiteral = (s) => {
  if (!s) {
    return '``';
  }
  let res = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    res += illegalChars.get(c) || c;
  }
  return `\`${res}\``;
}

const cssResultModule = (cssText) =>
  `import { css } from "lit";` +
  `export default css${stringToTemplateLiteral(cssText)};`;

let sassFiles = [];

module.exports = (snowpackConfig, pluginOptions) => {
  return {
    name: 'snowpack-lit-sass-plugin',
    resolve: { input: [".lit.sass"], output: [".js", ".css"] },
    onChange({ filePath }) {
      sassFiles.forEach((x) => this.markChanged(x));
    },
    async load({ filePath, isDev }) {
      if (sassFiles.indexOf(filePath) === -1) sassFiles.push(filePath);
      sass.render({
        file: filePath,
        includePaths: [dirname(filePath), join(process.cwd(), 'node_modules')]
      }, function (err, result) {
        if (err) {
          console.log(error.status); // used to be "code" in v2x and below
          console.log(error.column);
          console.log(error.message);
          console.log(error.line);
        }
        const css = result.css.toString();
        //console.log(result.css.toString());
        return {
          ".js": cssResultModule(css),
          ".css": css,
        };
      });
    },
    async optimize({ buildDirectory }) {
      glob.sync(buildDirectory + "/**/*.js").forEach((file) => {
        const content = fsSync.readFileSync(file, "utf8");
        const resolvedImports = proxyImportResolver(content);
        fsSync.writeFileSync(file, resolvedImports, "utf8");
      });
    },
  };
};
