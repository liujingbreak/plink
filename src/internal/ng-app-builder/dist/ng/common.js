"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newContext = exports.initCli = void 0;
const tslib_1 = require("tslib");
// import type api from '__api';
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_version_check_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/utils/node-version-check"));
const config_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/config"));
const bootstrap_server_1 = require("dr-comp-package/wfh/dist/utils/bootstrap-server");
// export type DrcpConfig = typeof api.config;
function initCli(options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield node_version_check_1.default();
        const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const config = yield initDrcp(options.drcpArgs, drcpConfigFiles);
        fs_extra_1.default.mkdirpSync(config.resolve('destDir', 'ng-app-builder.report'));
        return config;
    });
}
exports.initCli = initCli;
function initDrcp(drcpArgs, drcpConfigFiles) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (drcpArgs.c == null)
            drcpArgs.c = [];
        drcpArgs.c.push(...drcpConfigFiles);
        yield bootstrap_server_1.initConfigAsync({ config: drcpArgs.c, prop: drcpArgs.p || drcpArgs.prop || [] });
        return config_1.default;
    });
}
function newContext(ngBuildOption, options) {
    const constructor = require('./builder-context').BuilderContext;
    return new constructor(ngBuildOption, options);
}
exports.newContext = newContext;

//# sourceMappingURL=common.js.map
