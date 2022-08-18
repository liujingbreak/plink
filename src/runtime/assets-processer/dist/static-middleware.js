"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaticRoute = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const express_1 = tslib_1.__importDefault(require("express"));
const ms = require('ms');
function createStaticRoute(staticDir, maxAgeMap = {}) {
    let maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
    return express_1.default.static(staticDir, {
        setHeaders: createSetHeaderFunc(maxAgeNumMap),
        redirect: false
    });
}
exports.createStaticRoute = createStaticRoute;
// export function createZipRoute(maxAgeMap: {[extname: string]: string} = {}):
// serveZip.ZipResourceMiddleware {
//   const maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
//   const zss = serveZip('', {setHeaders: createSetHeaderFunc(maxAgeNumMap)});
//   return zss;
// }
function createSetHeaderFunc(maxAgeNumMap) {
    return (res, path, entry) => {
        var ext = path_1.default.extname(path).toLowerCase();
        if (ext.startsWith('.'))
            ext = ext.substring(1);
        if (lodash_1.default.has(maxAgeNumMap, ext))
            setCacheControlHeader(res, maxAgeNumMap[ext]);
        else
            res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
    };
}
function setCacheControlHeader(res, _maxage = 0, immutable = false) {
    if (_maxage == null) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
    }
    var cacheControl = 'public, max-age=' + Math.floor(_maxage / 1000);
    if (immutable) {
        cacheControl += ', immutable';
    }
    res.setHeader('Cache-Control', cacheControl);
}
function parseMaxAgeMap(maxAgeMap) {
    let maxAgeNumMap = {};
    for (const [key, value] of Object.entries(maxAgeMap)) {
        if (value != null)
            maxAgeNumMap[key] = typeof value === 'string' ? ms(value) : value;
    }
    return maxAgeNumMap;
}
//# sourceMappingURL=static-middleware.js.map