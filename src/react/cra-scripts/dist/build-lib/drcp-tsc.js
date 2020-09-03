"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bootstrap_server_1 = require("dr-comp-package/wfh/dist/utils/bootstrap-server");
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    yield bootstrap_server_1.initConfigAsync({
        config: [],
        prop: []
    });
    const { tsc } = yield Promise.resolve().then(() => tslib_1.__importStar(require('dr-comp-package/wfh/dist/ts-cmd')));
    const emitted = yield tsc({
        package: [process.argv[2]],
        ed: true, jsx: true,
        watch: process.argv.slice(3).indexOf('--watch') >= 0,
        compileOptions: {
            module: 'esnext',
            isolatedModules: true
        }
    });
    // tslint:disable-next-line: no-console
    console.log('[drcp-tsc] declaration files emitted:');
    // tslint:disable-next-line: no-console
    emitted.forEach(info => console.log(`[drcp-tsc] emitted: ${info[0]} ${info[1]}Kb`));
}))()
    .catch(err => {
    console.error('[child-process tsc] Typescript compilation contains errors');
    console.error(err);
});

//# sourceMappingURL=drcp-tsc.js.map
