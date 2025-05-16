"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tscService = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const inputTableFor = ['setbaseTsConfig'];
exports.tscService = new reactivizer_1.ReactorComposite2({
    name: 'tscService',
    debug: true,
    log: nodejs_utils_1.conciseConsoleLogger,
    inputTableFor
});
const formatHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
    getNewLine: () => typescript_1.default.sys.newLine
};
const { i, o, r, inputTable } = exports.tscService;
r('startWatch, addSourceFile, stopWatch -> onCompilerOptionsParsed, onDiagnostic, onCompilerCompleted', i.pt.startWatch.pipe(rx.mergeMap(a => inputTable.l.setbaseTsConfig.pipe(rx.map(b => [a, b]))), rx.mergeMap(([[m, opts, rootFiles], [, tsconfigJson, tsconfigDir]]) => {
    delete tsconfigJson.include;
    tsconfigJson.compilerOptions.incremental = false;
    tsconfigJson.compilerOptions.inlineSourceMap = true;
    const parsed = typescript_1.default.parseJsonConfigFileContent(tsconfigJson, typescript_1.default.sys, tsconfigDir);
    o.ft.onCompilerOptionsParsed(parsed).dp(m);
    const host = typescript_1.default.createWatchCompilerHost(rootFiles, parsed.options, typescript_1.default.sys, typescript_1.default.createEmitAndSemanticDiagnosticsBuilderProgram, diagnostic => {
        const formated = ['Error', diagnostic.code, ':', typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine())].join(' ');
        o.ft.onDiagnostic(formated, diagnostic).dp(m);
    }, (diagnostic, _newLine, _compilerOptions, _errorCount) => {
        o.ft.onCompilerCompleted(typescript_1.default.formatDiagnostic(diagnostic, formatHost), diagnostic).dp(m);
    });
    const program = typescript_1.default.createWatchProgram(host);
    return rx.merge(i.pt.addSourceFile.pipe(rx.map(([, files]) => {
        rootFiles.push(...files);
        program.updateRootFileNames(rootFiles);
    }))).pipe(rx.takeUntil(i.pt.stopWatch.pipe((0, reactivizer_1.actionOfContext)(m), rx.tap(() => program.close()))));
})));
const baseTsconfigFile = path_1.default.resolve(__dirname, '../../../tsconfig-base.json');
const baseTsconfig = JSON.parse(fs_1.default.readFileSync(baseTsconfigFile, 'utf8'));
i.ft.setbaseTsConfig(baseTsconfig, path_1.default.dirname(baseTsconfigFile)).dp();
//# sourceMappingURL=tsc-watch-service.js.map