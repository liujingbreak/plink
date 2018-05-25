"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __api_1 = require("__api");
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
