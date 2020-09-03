"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderContext = void 0;
const tslib_1 = require("tslib");
const config_webpack_1 = tslib_1.__importStar(require("../config-webpack"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
class BuilderContext {
    constructor(ngBuildOption, opt) {
        this.ngBuildOption = ngBuildOption;
        this.inlineAssets = new Map();
        this.webpackRunCount = 0;
        this.readyMessage = '';
        if (opt) {
            this.options = opt;
        }
        else {
            this.options = { inlineChunks: ['runtime'] };
        }
        this.options.inlineChunks.forEach(chunkName => this.inlineAssets.set(chunkName, null));
    }
    configWebpack(webpackConfig, drcpConfigSetting) {
        config_webpack_1.default(this, this.ngBuildOption, webpackConfig, drcpConfigSetting);
    }
    transformIndexHtml(content) {
        return config_webpack_1.transformIndexHtml(this, content);
    }
    printReady() {
        // tslint:disable-next-line: no-console
        console.log(chalk_1.default.red(this.readyMessage));
    }
}
exports.BuilderContext = BuilderContext;

//# sourceMappingURL=builder-context.js.map
