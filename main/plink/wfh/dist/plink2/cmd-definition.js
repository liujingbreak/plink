"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.define = define;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
// import fs from 'fs';
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const rx = tslib_1.__importStar(require("rxjs"));
const commander_1 = tslib_1.__importDefault(require("commander"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const misc_1 = require("../utils/misc");
const package_mgr2_1 = require("../package-mgr/package-mgr2");
const package_mgr2_lookup_1 = require("../package-mgr/package-mgr2-lookup");
const tsc_language_service_1 = require("./sub-cmds/tsc-language-service");
const tsc_language_service4pkg_1 = require("./sub-cmds/tsc-language-service4pkg");
const cmd_model_1 = require("./cmd-model");
function define(scp, logger) {
    const lang = (0, tsc_language_service_1.languageServices)();
    lang.config({ log: logger });
    const packageMgrService = (0, package_mgr2_1.createPackageMgrService)();
    packageMgrService.config({ log: logger });
    const pkgLookupService = (0, package_mgr2_lookup_1.createPlinkPackageLookupService)();
    pkgLookupService.service.config({ log: logger });
    const langExt = (0, tsc_language_service4pkg_1.addOnPackageFeatures)(lang, packageMgrService, pkgLookupService);
    // const canvas = createTerminalCanvas();
    // const rootWidget = createFlexContainer({debug: true, log: logger});
    // const textWidget = createTextWidget();
    // const versionTextWidget = createTextWidget();
    // canvas.config({log: logger, debug: true});
    const error$ = rx.merge(
    // canvas.error$,
    packageMgrService.error$, langExt.error$).pipe(rx.map(err => node_util_1.default.inspect(err)), rx.share());
    const { r, s } = scp;
    let latestCommandActionMeta;
    r('', rx.from(import('@wfh/terminal-ui')).pipe(rx.map(({ createFlexContainer, createTextWidget, createTerminalCanvas }) => {
    })));
    r('-> onCommandError', error$.pipe(rx.map(err => {
        if (latestCommandActionMeta)
            s.ft.onCommandError(err).dp(latestCommandActionMeta);
        else
            s.ft.onCommandError(err).dp();
    })));
    r('doCommand -> canvs.setClientWindowSize', s.pt.doCommand.pipe(rx.map(([m, cols, rows]) => {
        latestCommandActionMeta = m;
        // canvas.s.ft.setBounding(0, 0, cols, rows).dp(m);
    })));
    r('setRootDir', s.pt.setRootDir.pipe(rx.switchMap(([m, rootDir]) => {
        cmd_model_1.cmdModelService.i.ft.setRootDir(rootDir).dp();
        // rootWidget.s.ft.addChild(textWidget, versionTextWidget).dp();
        // textWidget.config({log: logger, debug: true});
        // versionTextWidget.config({log: logger, debug: true});
        // canvas.s.ft.setRootComponent(rootWidget).dp();
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
                .option('--stop', 'stop watching', false)
                .action(async (packages) => {
                console.log('Run tsc on', ...packages);
                const { s } = langExt;
                s.ft.setTsConfigOfPlinkBase().dp();
                if (tsc.opts().stop) {
                    s.ft.stop().dp();
                    return;
                }
                else if (tsc.opts().watch) {
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
            tsc.addHelpCommand();
            program.command('stop')
                .description('Stop daemon process')
                .action(async () => {
                await rx.firstValueFrom(cmd_model_1.cmdModelService.i.ft.shutdown().od(cmd_model_1.cmdModelService.o.pt.saved));
                s.ft.onShutdown().dp(m);
                cmd_model_1.cmdModelService.dispose();
                // eslint-disable-next-line no-console
                console.log('Bye');
            });
            program.command('dev:test').description('A test command')
                .action(async () => {
                console.log('hello world');
                await new Promise(resolve => setTimeout(() => {
                    // textWidget.s.ft.setContent('hello plink').dp();
                    // versionTextWidget.s.ft.setContent('2').dp();
                    // canvas.s.ft.render().dp();
                    resolve();
                }, 1000));
            });
            s.ft.onCommanderInited(program).dp(m);
        }));
    })));
    cmd_model_1.cmdModelService.r('didSwitchSpace -> setActiveInstallSpace', packageMgrService.ot.l.didSwitchSpace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([m, spaceKey]) => {
        if (spaceKey)
            cmd_model_1.cmdModelService.i.ft.setActiveInstallSpace(spaceKey).dp(m);
    })));
    cmd_model_1.cmdModelService.r('cmdModelService.enableRxMessageTrace ->', cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([, enabled]) => {
        packageMgrService.config({ debug: enabled });
        lang.config({ debug: enabled });
        // pkgLookupService.service.config({debug: enabled});
    })));
}
//# sourceMappingURL=cmd-definition.js.map