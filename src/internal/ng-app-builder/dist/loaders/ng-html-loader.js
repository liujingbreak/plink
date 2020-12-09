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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// import {RawSourceMap} from 'source-map';
const __api_1 = __importDefault(require("__api"));
const log = require('log4js').getLogger('ng-html-loader');
const _ = __importStar(require("lodash"));
const rxjs_1 = require("rxjs");
const vm = require("vm");
const html_assets_resolver_1 = require("../ng-aot-assets/html-assets-resolver");
const loader = function (content, map) {
    var callback = this.async();
    if (!callback) {
        this.emitError('loader does not support sync mode');
        throw new Error('loader does not support sync mode');
    }
    load(content, this)
        .then(result => this.callback(null, result, map))
        .catch(err => {
        this.callback(err);
        this.emitError(err);
        log.error(err);
    });
};
loader.compileHtml = load;
function load(content, loader) {
    return __awaiter(this, void 0, void 0, function* () {
        return html_assets_resolver_1.replaceForHtml(content, loader.resourcePath, (text) => {
            return new rxjs_1.Observable(subscriber => {
                // Unlike extract-loader, we does not support embedded require statement in source code 
                loader.loadModule(text, (err, source, sourceMap, module) => {
                    if (err)
                        return subscriber.error(err);
                    var sandbox = {
                        __webpack_public_path__: _.get(loader, '_compiler.options.output.publicPath', __api_1.default.config().publicPath),
                        module: {
                            exports: {}
                        }
                    };
                    vm.runInNewContext(source, vm.createContext(sandbox));
                    subscriber.next(sandbox.module.exports);
                    subscriber.complete();
                });
            });
        }).toPromise();
    });
}
module.exports = loader;

//# sourceMappingURL=ng-html-loader.js.map
