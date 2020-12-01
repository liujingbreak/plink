"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
const ts_ast_query_1 = __importStar(require("../ts-ast-query"));
const fs = __importStar(require("fs"));
const path_1 = require("path");
const ts = __importStar(require("typescript"));
// const log = require('log4js').getLogger('ts-ast-querySpec');
describe('ts-ast-query', () => {
    it('printAll demo', () => {
        const file = path_1.resolve(__dirname, 'manual-written sample file');
        const sel = new ts_ast_query_1.default('import api from \'__api\'', file);
        sel.printAll();
        expect(sel.findAll(':ImportDeclaration>.moduleSpecifier').length).toBe(1);
    });
    it('printAll should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file).printAll();
    });
    xit('printAllNoType should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file).printAllNoType();
    });
    it('Query should work', () => {
        // const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        // const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
        let q = new ts_ast_query_1.Query('.statements:VariableStatement  .namedBindings .elements[0] > :Identifier');
        console.log(q.queryPaths);
        expect(q.queryPaths.slice(0).map(c => c.slice(0).reverse()).reverse()).toEqual([
            [{ propertyName: 'statements', kind: 'VariableStatement' }],
            [{ propertyName: 'namedBindings' }],
            [{ propertyName: 'elements', propIndex: 0 }, { kind: 'Identifier' }]
        ]);
        expect(q.matchesConsecutiveNodes([q._parseDesc('.foobar:Abc'), q._parseDesc(':Off')].reverse(), ['.foobar[3]:Abc', '.end:Off'], 1)).toBe(true);
        expect(q.matchesConsecutiveNodes([q._parseDesc('.foobar:Abc'), q._parseDesc(':Off')].reverse(), ['.foobar[3]:Abc', '.end:Off'], 0)).toBe(false);
        expect(q.matches(
        // tslint:disable-next-line:max-line-length
        '.statements[0]:VariableStatement>.importClause:ImportClause>.namedBindings:NamedImports>.elements[0]:ImportSpecifier>.name:Identifier'
            .split('>'))).toBe(true);
        q = new ts_ast_query_1.Query(':ImportDeclaration :Identifier');
        expect(q.matches(('.statements[0]:ImportDeclaration>.importClause:ImportClause>.namedBindings:NamedImports>' +
            '.elements[0]:ImportSpecifier>.name:Identifier').split('>'))).toBe(true);
        expect(q.matches(('.statements[0]:ImportDeclaration>.importClause:ImportClause>.namedBindings:NamedImports>' +
            '.elements[1]:ImportSpecifier>.name:Identifier').split('>'))).toBe(true);
    });
    it('findFirst should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        const sel = new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file);
        const found = sel.findFirst(':ImportDeclaration :Identifier');
        expect(found != null).toBeTruthy();
        expect(found.getText(sel.src)).toBe('Injectable');
    });
    it('findAll should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        const sel = new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file);
        const found = sel.findAll(':ImportDeclaration :Identifier').map(ast => ast.getText(sel.src));
        console.log(found);
        expect(found.length).toBe(1);
    });
    it('findWith should work', () => {
        const target = `
		platformBrowserDynamic().bootstrapModule(AppModule)
		  .catch(err => console.log(err));
		`;
        const query = new ts_ast_query_1.default(target, 'main-hmr.ts');
        console.log('------>>>>----------');
        query.printAll(query.src);
        // const found = query.findAll(query.src,
        //   ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier');
        // console.log(found);
        const bootCall = query.findMapTo(query.src, '^ .statements>:CallExpression :PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
            // console.log('------>>>>----------');
            // console.log(ast.text, (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src));
            if (ast.text === 'platformBrowserDynamic' &&
                ast.parent.parent.name.getText(query.src) === 'bootstrapModule' &&
                ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
                // console.log('here');
                return ast.parent.parent.parent;
            }
        });
        expect(bootCall != null).toBe(true);
    });
});

//# sourceMappingURL=ts-ast-querySpec.js.map
