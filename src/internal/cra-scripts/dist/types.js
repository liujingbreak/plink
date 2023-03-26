"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKG_APP_ENTRY_DEFAULT = exports.PKG_APP_ENTRY_PROP = exports.PKG_LIB_ENTRY_DEFAULT = exports.PKG_LIB_ENTRY_PROP = exports.webpack = void 0;
var webpack_1 = require("webpack");
Object.defineProperty(exports, "webpack", { enumerable: true, get: function () { return __importDefault(webpack_1).default; } });
exports.PKG_LIB_ENTRY_PROP = 'cra-lib-entry';
exports.PKG_LIB_ENTRY_DEFAULT = 'public_api.ts';
exports.PKG_APP_ENTRY_PROP = 'cra-app-entry';
exports.PKG_APP_ENTRY_DEFAULT = 'start.tsx';
//# sourceMappingURL=types.js.map