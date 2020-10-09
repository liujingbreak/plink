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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2d6aXAtc2l6ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUU3QiwyREFBMkQ7QUFDM0QsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3RDLElBQUksRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUUxQyxNQUFxQixRQUFRO0lBQTdCO1FBRUUsU0FBSSxHQUFHLEtBQUssQ0FBQztJQXVEZixDQUFDO0lBckRDLEtBQUssQ0FBQyxRQUFhO1FBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxXQUFnQixFQUFFLEVBQUU7WUFDOUQsSUFBSSxJQUFJLENBQUMsSUFBSTtnQkFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLEdBQUcsR0FBNEIsRUFBRSxDQUFDO1lBQ3RDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDOUUsSUFBSSxVQUFVLElBQUksSUFBSTtnQkFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFM0Is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
