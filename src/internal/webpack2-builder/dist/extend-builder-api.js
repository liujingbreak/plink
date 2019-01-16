"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const Webpack = require('webpack');
var newApi = Object.getPrototypeOf(__api_1.default);
newApi.configWebpackLater = function (execFunc) {
    require('..').tapable.plugin('webpackConfig', function (webpackConfig, cb) {
        Promise.resolve(execFunc(webpackConfig, Webpack))
            .then((cfg) => cb(null, cfg))
            .catch((err) => cb(err, null));
    });
};

//# sourceMappingURL=extend-builder-api.js.map
