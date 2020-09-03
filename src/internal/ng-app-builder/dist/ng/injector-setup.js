"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectorSetup = void 0;
const tslib_1 = require("tslib");
const url_1 = require("url");
const path_1 = tslib_1.__importDefault(require("path"));
// import api from '__api';
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const api_share_1 = require("../../isom/api-share");
const main_1 = require("dr-comp-package/wfh/dist/build-util/ts/main");
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
function walkPackagesAndSetupInjector(browserOptions, ssr = false) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const packageInfo = main_1.walkPackages();
        yield injectorSetup(packageInfo, browserOptions.drcpArgs, browserOptions.deployUrl, browserOptions.baseHref, ssr);
        return packageInfo;
    });
}
exports.default = walkPackagesAndSetupInjector;
function injectorSetup(packageInfo, drcpArgs, deployUrl, baseHref, ssr = false) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const [pks, apiProto] = package_runner_1.initInjectorForNodePackages(drcpArgs, packageInfo);
        yield package_runner_1.initWebInjector(pks, apiProto);
        const publicUrlObj = url_1.parse(deployUrl || '');
        const baseHrefPath = baseHref ? url_1.parse(baseHref).pathname : undefined;
        Object.assign(apiProto, {
            deployUrl,
            ssr,
            ngBaseRouterPath: publicUrlObj.pathname ? lodash_1.default.trim(publicUrlObj.pathname, '/') : '',
            ngRouterPath: api_share_1.createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
            ssrRequire(requirePath) {
                if (ssr)
                    return require(path_1.default.join(this.__dirname, requirePath));
            }
        });
    });
}
exports.injectorSetup = injectorSetup;

//# sourceMappingURL=injector-setup.js.map
