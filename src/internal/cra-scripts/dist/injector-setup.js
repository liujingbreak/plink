"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
// import NodeApi from '@wfh/plink/wfh/dist/package-mgr/node-package-api';
// import {walkPackages } from '@wfh/plink/wfh/dist/build-util/ts/main';
// import {initInjectorForNodePackages, initWebInjector} from '@wfh/plink/wfh/dist/package-runner';
// import {AngularBuilderOptions} from './common';
function augmentApi(ssr = false) {
    const publicUrlObj = url_1.parse(process.env.PUBLIC_URL || '');
    Object.assign(Object.getPrototypeOf(__api_1.default), {
        deployUrl: process.env.PUBLIC_URL,
        ssr,
        ngBaseRouterPath: publicUrlObj.pathname ? lodash_1.default.trim(publicUrlObj.pathname, '/') : '',
        // ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
        ssrRequire(requirePath) {
            if (ssr)
                return require(path_1.default.join(this.__dirname, requirePath));
        }
    });
}
exports.default = augmentApi;
// function injectorSetup(packageInfo: ReturnType<typeof walkPackages>, ssr = false): NodeApi {
//   const [pks, apiProto] = initInjectorForNodePackages({}, packageInfo);
//   initWebInjector(pks, apiProto);
//   const publicUrlObj = parse(process.env.PUBLIC_URL || '');
//   // const baseHrefPath = baseHref ? parse(baseHref).pathname : undefined;
//   Object.assign(apiProto, {
//     deployUrl: process.env.PUBLIC_URL,
//     ssr,
//     ngBaseRouterPath: publicUrlObj.pathname ? _.trim(publicUrlObj.pathname, '/') : '',
//     // ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
//     ssrRequire(requirePath: string) {
//       if (ssr)
//         return require(Path.join(this.__dirname, requirePath));
//     }
//   });
//   return apiProto;
// }

//# sourceMappingURL=injector-setup.js.map
