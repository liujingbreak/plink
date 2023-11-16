"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const markdown_util_1 = require("./markdown-util");
// require('node:inspector').open(9222, 'localhost', true);
const markdownLoader = function (source, sourceMap) {
    const cb = this.async();
    const importCode = [];
    let imgIdx = 0;
    // const logger = this.getLogger('markdown-loader');
    // debugger;
    (0, markdown_util_1.markdownToHtml)(source, imgSrc => {
        const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
        importCode.push(`import imgSrc${imgIdx} from '${url}';`);
        return Promise.resolve('imgSrc' + (imgIdx++));
    })
        .pipe(op.take(1), op.map(result => {
        cb(null, importCode.join('\n') + '\nconst html = ' + result.content + ';\nlet toc = ' + JSON.stringify(result.toc) + ';\nlet m = {html, toc};\nexport default m;\n', sourceMap);
    }), op.catchError(err => {
        cb(err, JSON.stringify(err), sourceMap);
        return rx.EMPTY;
    }))
        .subscribe();
};
exports.default = markdownLoader;
//# sourceMappingURL=markdown-loader.js.map