"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
// var log = require('log4js').getLogger('gzipSizePlugin');
const gzipSize = require('gzip-size');
var { magenta, cyan } = require('chalk');
var prettyBytes = require('pretty-bytes');
class GzipSize {
    constructor() {
        this.done = false;
    }
    apply(compiler) {
        this.compiler = compiler;
        compiler.hooks.emit.tapPromise('GzipSize', (compilation) => {
            if (this.done)
                return Promise.resolve();
            this.done = true;
            var all = [];
            var maxLenName = _.max(_.map(compilation.assets, (src, file) => file.length));
            _.each(compilation.assets, (source, file) => {
                if (Path.extname(file) === '.map')
                    return;
                all.push(gzipSize(source.source()).then((size) => {
                    let colorFunc;
                    if (size >= 100 * 1024) {
                        colorFunc = magenta;
                    }
                    else {
                        colorFunc = cyan;
                    }
                    return [file, size, colorFunc];
                }));
            });
            return Promise.all(all).then((rawDatas) => {
                rawDatas.sort((item, item2) => {
                    return item2[1] - item[1];
                })
                    .forEach((item) => {
                    item[1] = prettyBytes(item[1]);
                });
                const datas = rawDatas;
                var maxLenSize = _.max(_.map(datas, data => data[1].length));
                var sepLineLen = '(gzipped)'.length + maxLenSize + maxLenName + 10;
                console.log();
                console.log(_.pad(' Gzip size ', sepLineLen, '-'));
                _.each(datas, (data) => {
                    console.log(_.padStart(data[0], maxLenName + 2, ' ') +
                        data[2](_.padStart(data[1], maxLenSize + 2, ' ')) + ' (gzipped)');
                });
                console.log(_.pad('', sepLineLen, '-'));
            })
                .catch((err) => {
                console.log('Failed in GzipSize plugin', err);
            });
        });
    }
}
exports.default = GzipSize;

//# sourceMappingURL=gzip-size.js.map
