"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.define = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
// import fs from 'fs';
const rx = tslib_1.__importStar(require("rxjs"));
const commander_1 = tslib_1.__importDefault(require("commander"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const misc_1 = require("../utils/misc");
const package_mgr2_1 = require("../package-mgr/package-mgr2");
const package_mgr2_lookup_1 = require("../package-mgr/package-mgr2-lookup");
const tsc_language_service_1 = require("./sub-cmds/tsc-language-service");
const tsc_language_service4pkg_1 = require("./sub-cmds/tsc-language-service4pkg");
const cmd_model_1 = require("./cmd-model");
function define(rootDir, onShutdown) {
    const lang = (0, tsc_language_service_1.languageServices)();
    const packageMgrService = (0, package_mgr2_1.createPackageMgrService)();
    const pkgLookupService = (0, package_mgr2_lookup_1.createPlinkPackageLookupService)();
    const langExt = (0, tsc_language_service4pkg_1.addOnPackageFeatures)(lang, packageMgrService, pkgLookupService);
    cmd_model_1.cmdModelService.i.ft.setRootDir(rootDir).dp();
    cmd_model_1.cmdModelService.r('didSwitchSpace -> setActiveInstallSpace', packageMgrService.ot.l.didSwitchSpace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([m, spaceKey]) => {
        if (spaceKey)
            cmd_model_1.cmdModelService.i.ft.setActiveInstallSpace(spaceKey).dp(m);
    })));
    cmd_model_1.cmdModelService.r('cmdModelService.enableRxMessageTrace ->', cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([, enabled]) => {
        packageMgrService.config({ debug: enabled });
        lang.config({ debug: enabled });
        // pkgLookupService.service.config({debug: enabled});
    })));
    return cmd_model_1.cmdModelService.outputTable.l.load.pipe(rx.map(([, done]) => done), rx.filter(done => done), rx.take(1), rx.mergeMap(() => packageMgrService.i.ft.scan(rootDir)
        .do(packageMgrService.o.pt.onScanCompleted)), rx.mergeMap(() => rx.combineLatest([
        cmd_model_1.cmdModelService.it.l.enableRxMessageTrace,
        cmd_model_1.cmdModelService.it.l.setActiveInstallSpace.pipe(rx.take(1)) // take only initially loaded value
    ])), rx.map(([[, enabled], [, activeSpaceKey]]) => [enabled, activeSpaceKey]), 
    // rx.distinctUntilChanged((a) => ),
    rx.map(([enableRxMessageTrace, activeSpaceKey]) => {
        packageMgrService.o.ft.didSwitchSpace(activeSpaceKey, [], [], 0, 0).dp();
        const program = new commander_1.default.Command('plink');
        program.description('A monorepo and multi-repo management tool')
            .action(() => {
            console.log((0, misc_1.sexyFont)('PLink').string);
            console.log(program.helpInformation());
        });
        program.addHelpCommand('help [command]', 'show help information, same as "-h". ');
        program.command('switch')
            .argument('<directory>', 'target directory')
            .description('switch installation directory')
            .action(async (dir) => {
            await rx.firstValueFrom(packageMgrService.i.ft.switchToSpace(dir).od(packageMgrService.o.pt.didSwitchSpace));
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
        const tsc = program.command('tsc')
            .argument('[package...]', 'target packages')
            .description('Run Typescript compiler')
            .option('-w, --watch', 'Typescript compiler watch mode', false)
            .option('--poll', 'Use poll mode watch', false)
            .option('--pj, --project <project-dir,...>', 'Compile only specific project directory', (v, prev) => {
            prev.push(...v.split(','));
            return prev;
        }, [])
            .action(async (packages) => {
            console.log('Run tsc on', ...packages);
            const { s } = langExt;
            s.ft.setTsConfigOfPlinkBase().dp();
            if (tsc.opts().watch) {
                if (langExt.table.getData().setWatching[0] === true) {
                    console.log('Previous "tsc" watching command is still in process, you need to run "tsc --stop" command to stop it before you proceed new watching command.');
                    return;
                }
                s.ft.watchSourcePackage(packages).dp();
                console.log('watching and compiling...');
                return;
            }
            const done$ = s.ft.addSourcePackage(packages).od(s.pt.didAddSourcePackage);
            await rx.lastValueFrom(rx.merge(s.pt.emitFile.pipe(
            // rx.mergeMap(([, file, content]) => {
            //   return fs.promises.writeFile(file, content);
            // }),
            rx.takeUntil(done$)), done$.pipe(rx.take(1), rx.mergeMap(([, countFile, emitFiles, suggests, fails]) => packageMgrService.ot.l.rootDir.pipe(rx.take(1), rx.map(([, _rootDir]) => {
                console.log('Written files:');
                for (const emitFile of emitFiles) {
                    console.log(' ', emitFile);
                }
                if (suggests.length > 0) {
                    for (const [, msg] of suggests)
                        console.log(chalk_1.default.yellow('[suggestion]'), msg);
                }
                if (fails.length > 0) {
                    for (const [, diag] of fails)
                        console.log(chalk_1.default.red('[error]'), diag);
                }
                console.log(`Total ${countFile} files, ${emitFiles.length} is written successfully`);
            }))))));
        });
        program.command('stop')
            .description('Stop daemon process')
            .action(async () => {
            await rx.firstValueFrom(cmd_model_1.cmdModelService.i.ft.shutdown().od(cmd_model_1.cmdModelService.o.pt.saved));
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