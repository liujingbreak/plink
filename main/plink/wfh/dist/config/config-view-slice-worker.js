"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createService = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const node_worker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker");
const ts_ast_query_1 = tslib_1.__importDefault(require("../utils/ts-ast-query"));
function createService(debug = false) {
    const service = (0, node_worker_1.createWorkerControl)({
        name: 'configViewSliceWorker',
        debug,
        debugExcludeTypes: ['inited']
    });
    const { s: i, s: o, r } = service;
    r('parseDtsInWorker', i.pt.parseDtsInWorker.pipe(rx.mergeMap(async ([m, dtsFileBase, typeExport]) => {
        const done$ = o.ft.fork('parseDts', dtsFileBase, typeExport).do(i.pt.parseDtsDone);
        const [, ...results] = await node_worker_1.setIdleDuring.asPromise(service, done$);
        o.ft.parseDtsDone(...results).dp(m);
    })));
    r('parseDts', i.pt.parseDts.pipe(rx.concatMap(async ([m, dtsFileBase, typeExport]) => {
        const results = await doParse(dtsFileBase, typeExport);
        o.ft.parseDtsDone(...results).dp(m);
    })));
    return service;
}
exports.createService = createService;
async function doParse(dtsFileBase, typeExport) {
    const dtsFile = fs_1.default.existsSync(dtsFileBase + 'ts') ? dtsFileBase + '.ts' : dtsFileBase + '.d.ts';
    const content = await fs_1.default.promises.readFile(dtsFile, 'utf-8');
    const sel = new ts_ast_query_1.default(content, dtsFile);
    let interfAst;
    sel.some(null, '^:InterfaceDeclaration', (ast, _path, _parents, _isLeaf, _comment) => {
        if (ast.name.getText() === typeExport) {
            // const symbol = checker.getSymbolsInScope((ast as ts.InterfaceDeclaration).name, ts.SymbolFlags.Interface);
            // console.log(symbol);
            interfAst = ast;
            return true;
        }
    });
    const metas = [];
    if (interfAst) {
        sel.some(interfAst, '^.members:PropertySignature', (ast, _path, _parents, _isLeaf, comment) => {
            var _a;
            const node = ast;
            // const symbol = checker.getSymbolAtLocation(node.type!);
            // console.log(node.name.getText(), symbol);
            // if (symbol) {
            //   console.log(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
            // }
            metas.push({
                property: node.name.getText(),
                desc: comment ? comment.replace(/(?:^\/\*\*\s*|\*\/$)/g, '').replace(/^\s*\*/mg, '') : '',
                type: ((_a = node.type) === null || _a === void 0 ? void 0 : _a.getText()) || '',
                optional: !!node.questionToken
            });
        });
    }
    return [metas, dtsFile];
}
//# sourceMappingURL=config-view-slice-worker.js.map