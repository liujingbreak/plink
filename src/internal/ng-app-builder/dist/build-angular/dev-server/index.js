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
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
require("../../ng/node-inject");
const lodash_1 = __importDefault(require("lodash"));
const build_angular_1 = require("@angular-devkit/build-angular");
const architect_1 = require("@angular-devkit/architect");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const drcpCommon = __importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(drcpConfig => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptions(drcpConfig, context, options));
    }), operators_1.concatMap((browserOptions) => {
        const drcpBuilderCtx = drcpCommon.newContext({
            builderConfig: options,
            browserOptions,
            ssr: false
        });
        return build_angular_1.executeDevServerBuilder(options, context, {
            webpackConfiguration: (config) => __awaiter(void 0, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }), operators_1.tap(() => {
        console.log(drawPuppy('You may also run "node app" and access from http://localhost:14333'));
    }));
});
function drawPuppy(slogon = 'Congrads!', message = '') {
    console.log('\n   ' + lodash_1.default.repeat('-', slogon.length) + '\n' +
        ` < ${slogon} >\n` +
        '   ' + lodash_1.default.repeat('-', slogon.length) + '\n' +
        '\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||');
    if (message)
        console.log(message);
}

//# sourceMappingURL=index.js.map
