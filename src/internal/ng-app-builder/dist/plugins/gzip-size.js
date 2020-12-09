"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
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
            if (maxLenName == null)
                return Promise.resolve();
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
                if (maxLenSize == null)
                    maxLenSize = 0;
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
