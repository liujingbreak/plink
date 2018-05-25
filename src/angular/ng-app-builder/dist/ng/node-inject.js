"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const Path = require("path");
const postcss_cli_resource_1 = require("./postcss-cli-resource");
let { nodeInjector } = require('dr-comp-package/wfh/lib/injectorFactory');
nodeInjector.fromDir(Path.dirname(require.resolve('@angular-devkit/build-angular')))
    .factory(/postcss-cli-resources/, (file) => {
    console.log('Hack postcss-cli-resources in ', file);
    return {
        default: postcss_cli_resource_1.default
    };
});

//# sourceMappingURL=node-inject.js.map
