"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
const loader = function (source, sourceMap) {
    const file = this.resourcePath;
    // const opts = this.query as Options;
    log.warn('debug loader', file, /\bnode_modules\b/.test(file) ? '' : '\n' + source);
    const cb = this.async();
    cb(null, source, sourceMap);
};
exports.default = loader;
//# sourceMappingURL=debug-loader.js.map