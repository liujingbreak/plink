"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.define = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const commander_1 = tslib_1.__importDefault(require("commander"));
const misc_1 = require("../utils/misc");
const package_mgr2_1 = require("../package-mgr/package-mgr2");
async function define(rootDir, onShutdown) {
    const packageMgrService = (0, package_mgr2_1.createPackageMgrService)();
    await rx.firstValueFrom(packageMgrService.i.ft.scan(rootDir)
        .do(packageMgrService.o.pt.onScanCompleted));
    const program = new commander_1.default.Command('plink');
    program.description('A monorepo and multi-repo management tool')
        .action(() => {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
    });
    program.command('stop')
        .description('Stop daemon process')
        .action(onShutdown);
    return Promise.resolve(program);
}
exports.define = define;
//# sourceMappingURL=cmd-definition.js.map