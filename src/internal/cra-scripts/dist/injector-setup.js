"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectorSetup = void 0;
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
// import api from '__api';
const lodash_1 = __importDefault(require("lodash"));
const main_1 = require("dr-comp-package/wfh/dist/build-util/ts/main");
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
// import {AngularBuilderOptions} from './common';
function walkPackagesAndSetupInjector(ssr = false) {
    const packageInfo = main_1.walkPackages();
    const api = injectorSetup(packageInfo, ssr);
    return api;
}
exports.default = walkPackagesAndSetupInjector;
function injectorSetup(packageInfo, ssr = false) {
    const [pks, apiProto] = package_runner_1.initInjectorForNodePackages({}, packageInfo);
    package_runner_1.initWebInjector(pks, apiProto);
    const publicUrlObj = url_1.parse(process.env.PUBLIC_URL || '');
    // const baseHrefPath = baseHref ? parse(baseHref).pathname : undefined;
    Object.assign(apiProto, {
        deployUrl: process.env.PUBLIC_URL,
        ssr,
        ngBaseRouterPath: publicUrlObj.pathname ? lodash_1.default.trim(publicUrlObj.pathname, '/') : '',
        // ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
        ssrRequire(requirePath) {
            if (ssr)
                return require(path_1.default.join(this.__dirname, requirePath));
        }
    });
    return apiProto;
}
exports.injectorSetup = injectorSetup;

//# sourceMappingURL=injector-setup.js.map
