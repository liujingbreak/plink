"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdModelService = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const inputTableFor = ['enableRxMessageTrace', 'setRootDir'];
const outputTableFor = ['load'];
exports.cmdModelService = new reactivizer_1.ReactorComposite2({
    name: 'CmdModel',
    debug: true,
    inputTableFor,
    outputTableFor
});
const { i, o, r, inputTable } = exports.cmdModelService;
r('shutdown -> save', i.pt.shutdown.pipe(rx.mergeMap(a => inputTable.l.setRootDir.pipe(rx.map(b => [a, b]), rx.take(1))), rx.concatMap(async ([[m], [, rootDir]]) => {
    try {
        await fs_1.default.promises.writeFile(path_1.default.resolve(rootDir, '.plink2.stat.json'), JSON.stringify(inputTable.getData(), null, '  '));
        o.ft.saved().dp(m);
    }
    catch (err) {
        exports.cmdModelService.dispatchErrorFor(err, m);
    }
})));
o.ft.load(false).dp();
r('-> load', inputTable.l.setRootDir.pipe(rx.take(1), rx.mergeMap(async ([, rootDir]) => {
    const statFile = path_1.default.resolve(rootDir, '.plink2.stat.json');
    try {
        const content = await fs_1.default.promises.readFile(statFile, 'utf8');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const json = JSON.parse(content);
        for (const [type, params] of Object.entries(json)) {
            exports.cmdModelService.i.dispatchFactory(type)(...params);
        }
    }
    catch (err) {
        i.ft.enableRxMessageTrace(false).dp();
    }
    finally {
        o.ft.load(true).dp();
    }
})));
//# sourceMappingURL=cmd-model.js.map