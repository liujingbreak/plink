"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("../../ng/node-inject");
const build_angular_1 = require("@angular-devkit/build-angular");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const architect_1 = require("@angular-devkit/architect");
const drcpCommon = tslib_1.__importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(config => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptionsForBuild(config, options, context));
    }), operators_1.concatMap(browserOptions => {
        const drcpBuilderCtx = drcpCommon.newContext({
            browserOptions,
            ssr: false
        });
        return build_angular_1.executeBrowserBuilder(browserOptions, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
});

//# sourceMappingURL=index.js.map
