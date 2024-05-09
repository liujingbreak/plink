"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.define = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const rx = tslib_1.__importStar(require("rxjs"));
const commander_1 = tslib_1.__importDefault(require("commander"));
const misc_1 = require("../utils/misc");
const package_mgr2_1 = require("../package-mgr/package-mgr2");
const cmd_model_1 = require("./cmd-model");
function define(rootDir, onShutdown) {
    const packageMgrService = (0, package_mgr2_1.createPackageMgrService)();
    cmd_model_1.cmdModelService.i.ft.setRootDir(rootDir).dp();
    return cmd_model_1.cmdModelService.outputTable.l.load.pipe(rx.map(([, done]) => done), rx.filter(done => done), rx.take(1), rx.mergeMap(() => packageMgrService.i.ft.scan(rootDir)
        .do(packageMgrService.o.pt.onScanCompleted)), rx.mergeMap(() => cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace), rx.map(([, enabled]) => enabled), rx.distinctUntilChanged(), rx.map(enableRxMessageTrace => {
        const program = new commander_1.default.Command('plink');
        program.description('A monorepo and multi-repo management tool')
            .action(() => {
            console.log((0, misc_1.sexyFont)('PLink').string);
            console.log(program.helpInformation());
        });
        program.command('switch')
            .argument('<directory>', 'target directory')
            .description('switch installation directory')
            .action(async (dir) => {
            await rx.firstValueFrom(packageMgrService.i.ft.switchToSpace(dir).ddo(packageMgrService.o.pt.didSwitchSpace));
        });
        if (enableRxMessageTrace) {
            program.command('disable-trace')
                .description('Stop printing debug messages')
                .action(() => {
                cmd_model_1.cmdModelService.i.ft.enableRxMessageTrace(false).dp();
                console.log('Disabled');
            });
        }
        else {
            program.command('enable-trace')
                .description('Print debug messages')
                .action(() => {
                cmd_model_1.cmdModelService.i.ft.enableRxMessageTrace(true).dp();
                console.log('Enabled');
            });
        }
        program.command('stop')
            .description('Stop daemon process')
            .action(async () => {
            await rx.firstValueFrom(cmd_model_1.cmdModelService.i.ft.shutdown().ddo(cmd_model_1.cmdModelService.o.pt.saved));
            onShutdown();
            cmd_model_1.cmdModelService.dispose();
            // eslint-disable-next-line no-console
            console.log('Bye');
        });
        return program;
    }));
}
exports.define = define;
//# sourceMappingURL=cmd-definition.js.map