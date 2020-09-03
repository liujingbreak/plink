"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
require("../../ng/node-inject");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const build_angular_1 = require("@angular-devkit/build-angular");
const architect_1 = require("@angular-devkit/architect");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const drcpCommon = tslib_1.__importStar(require("../../ng/common"));
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
            webpackConfiguration: (config) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
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
