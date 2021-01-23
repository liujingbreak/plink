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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3ppcC1zaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ3ppcC1zaXplLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBRTdCLDJEQUEyRDtBQUMzRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDdEMsSUFBSSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkMsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRTFDLE1BQXFCLFFBQVE7SUFBN0I7UUFFRSxTQUFJLEdBQUcsS0FBSyxDQUFDO0lBdURmLENBQUM7SUFyREMsS0FBSyxDQUFDLFFBQWE7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQWdCLEVBQUUsRUFBRTtZQUM5RCxJQUFJLElBQUksQ0FBQyxJQUFJO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLElBQUksR0FBRyxHQUE0QixFQUFFLENBQUM7WUFDdEMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5RSxJQUFJLFVBQVUsSUFBSSxJQUFJO2dCQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUUzQixDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxN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YmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5cbi8vIHZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2d6aXBTaXplUGx1Z2luJyk7XG5jb25zdCBnemlwU2l6ZSA9IHJlcXVpcmUoJ2d6aXAtc2l6ZScpO1xudmFyIHttYWdlbnRhLCBjeWFufSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG52YXIgcHJldHR5Qnl0ZXMgPSByZXF1aXJlKCdwcmV0dHktYnl0ZXMnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR3ppcFNpemUge1xuICBjb21waWxlcjogYW55O1xuICBkb25lID0gZmFsc2U7XG5cbiAgYXBwbHkoY29tcGlsZXI6IGFueSkge1xuICAgIHRoaXMuY29tcGlsZXIgPSBjb21waWxlcjtcbiAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ0d6aXBTaXplJywgKGNvbXBpbGF0aW9uOiBhbnkpID0+IHtcbiAgICAgIGlmICh0aGlzLmRvbmUpXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIHRoaXMuZG9uZSA9IHRydWU7XG4gICAgICB2YXIgYWxsOiBBcnJheTxQcm9taXNlTGlrZTxhbnk+PiA9IFtdO1xuICAgICAgdmFyIG1heExlbk5hbWUgPSBfLm1heChfLm1hcChjb21waWxhdGlvbi5hc3NldHMsIChzcmMsIGZpbGUpID0+IGZpbGUubGVuZ3RoKSk7XG4gICAgICBpZiAobWF4TGVuTmFtZSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICAgIF8uZWFjaChjb21waWxhdGlvbi5hc3NldHMsIChzb3VyY2UsIGZpbGUpID0+IHtcbiAgICAgICAgaWYgKFBhdGguZXh0bmFtZShmaWxlKSA9PT0gJy5tYXAnKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgYWxsLnB1c2goZ3ppcFNpemUoc291cmNlLnNvdXJjZSgpKS50aGVuKChzaXplOiBudW1iZXIpID0+IHtcbiAgICAgICAgICBsZXQgY29sb3JGdW5jOiBhbnk7XG4gICAgICAgICAgaWYgKHNpemUgPj0gMTAwICogMTAyNCkge1xuICAgICAgICAgICAgY29sb3JGdW5jID0gbWFnZW50YTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29sb3JGdW5jID0gY3lhbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFtmaWxlLCBzaXplLCBjb2xvckZ1bmNdO1xuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChhbGwpLnRoZW4oKHJhd0RhdGFzOiBBcnJheTxbc3RyaW5nLCBudW1iZXJdPikgPT4ge1xuICAgICAgICByYXdEYXRhcy5zb3J0KChpdGVtOiBbc3RyaW5nLCBudW1iZXJdLCBpdGVtMjogW3N0cmluZywgbnVtYmVyXSkgPT4ge1xuICAgICAgICAgIHJldHVybiBpdGVtMlsxXSAtIGl0ZW1bMV07XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKChpdGVtOiBbc3RyaW5nLCBudW1iZXJdKSA9PiB7XG4gICAgICAgICAgaXRlbVsxXSA9IHByZXR0eUJ5dGVzKGl0ZW1bMV0pO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgZGF0YXMgPSAocmF3RGF0YXMgYXMgYW55KSBhcyBBcnJheTxbc3RyaW5nLCBzdHJpbmddPjtcblxuICAgICAgICB2YXIgbWF4TGVuU2l6ZSA9IF8ubWF4KF8ubWFwKGRhdGFzLCBkYXRhID0+IGRhdGFbMV0ubGVuZ3RoKSk7XG5cbiAgICAgICAgaWYgKG1heExlblNpemUgPT0gbnVsbClcbiAgICAgICAgICBtYXhMZW5TaXplID0gMDtcblxuICAgICAgICB2YXIgc2VwTGluZUxlbiA9ICcoZ3ppcHBlZCknLmxlbmd0aCArIG1heExlblNpemUgKyBtYXhMZW5OYW1lISArIDEwO1xuICAgICAgICBjb25zb2xlLmxvZygpO1xuICAgICAgICBjb25zb2xlLmxvZyhfLnBhZCgnIEd6aXAgc2l6ZSAnLCBzZXBMaW5lTGVuLCAnLScpKTtcblxuICAgICAgICBfLmVhY2goZGF0YXMsIChkYXRhOiBhbnkpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhfLnBhZFN0YXJ0KGRhdGFbMF0sIG1heExlbk5hbWUhICsgMiwgJyAnKSArXG4gICAgICAgICAgICBkYXRhWzJdKF8ucGFkU3RhcnQoZGF0YVsxXSwgbWF4TGVuU2l6ZSEgKyAyLCAnICcpKSArICcgKGd6aXBwZWQpJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyhfLnBhZCgnJywgc2VwTGluZUxlbiwgJy0nKSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnI6IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnRmFpbGVkIGluIEd6aXBTaXplIHBsdWdpbicsIGVycik7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIl19