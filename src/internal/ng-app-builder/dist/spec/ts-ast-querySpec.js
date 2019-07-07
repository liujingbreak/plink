"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const ts_ast_query_1 = tslib_1.__importStar(require("../utils/ts-ast-query"));
const fs = tslib_1.__importStar(require("fs"));
const path_1 = require("path");
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
        expect(found.getText(sel.src)).toBe('NgModule');
    });
    it('findAll should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        const sel = new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file);
        const found = sel.findAll(':ImportDeclaration :Identifier').map(ast => ast.getText(sel.src));
        console.log(found);
        expect(found.length).toBe(18);
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
        const bootCall = query.findWith(query.src, '^.statements>:CallExpression :PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
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
const ts_ast_util_1 = require("../utils/ts-ast-util");
const ts = tslib_1.__importStar(require("typescript"));
describe('ts-ast-util', () => {
    let testContent;
    const testFile = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
    beforeAll(() => {
        testContent = fs.readFileSync(testFile, 'utf8');
    });
    it('resolveModule() should work', () => {
        expect(ts_ast_util_1.defaultResolveModule('./abc', __filename).replace(/\\/g, '/')).toBe(__dirname.replace(/\\/g, '/') + '/abc');
        expect(ts_ast_util_1.defaultResolveModule('abc', __filename).replace(/\\/g, '/'))
            .toBe(path_1.resolve('node_modules/abc').replace(/\\/g, '/'));
    });
    it('resolveImportBindName', () => {
        const src = ts.createSourceFile(testFile, testContent, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        const res = ts_ast_util_1.resolveImportBindName(src, '@bk/env/environment', 'environment');
        expect(res).toBe('env');
    });
    it('resolveImportBindName for import name space binding', () => {
        const testSample = 'import * as ng from "@angular/core";\
			@ng.Component({})\
			class MyComponent {}\
		';
        const src = ts.createSourceFile(testFile, testSample, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        new ts_ast_query_1.default(src).printAll();
        const res = ts_ast_util_1.resolveImportBindName(src, '@angular/core', 'Component');
        expect(res).toBe('ng.Component');
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLDhFQUF3RTtBQUN4RSwrQ0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtEQUErRDtBQUUvRCxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUM1QixFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMzQixzRUFBc0U7UUFDdEUsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxHQUFHLElBQUksb0JBQUssQ0FBQywwRUFBMEUsQ0FBQyxDQUFDO1FBQzlGLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDN0UsQ0FBQyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUM7WUFDM0QsQ0FBQyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsQ0FBQztZQUNuQyxDQUFDLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUM7U0FDckUsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFFLENBQVMsQ0FBQyx1QkFBdUIsQ0FDckMsQ0FBRSxDQUFTLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFHLENBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFDL0UsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsTUFBTSxDQUFFLENBQVMsQ0FBQyx1QkFBdUIsQ0FDckMsQ0FBRSxDQUFTLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFHLENBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFDL0UsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFakIsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPO1FBQ2QsMkNBQTJDO1FBQzNDLHVJQUF1STthQUN0SSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixDQUFDLEdBQUcsSUFBSSxvQkFBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQywwRkFBMEY7WUFDMUcsK0NBQStDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLDBGQUEwRjtZQUMxRywrQ0FBK0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxLQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUU3RixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRW5CLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLE1BQU0sR0FBRzs7O0dBR2hCLENBQUM7UUFDQSxNQUFNLEtBQUssR0FBRyxJQUFJLHNCQUFRLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQix5Q0FBeUM7UUFDekMsd0ZBQXdGO1FBRXhGLHNCQUFzQjtRQUV0QixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQ3ZDLDhHQUE4RyxFQUM5RyxDQUFDLEdBQWtCLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3BDLHVDQUF1QztZQUN2QyxxR0FBcUc7WUFDckcsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHdCQUF3QjtnQkFDeEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFzQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLGlCQUFpQjtnQkFDaEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRTtnQkFDOUQsdUJBQXVCO2dCQUN2QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNqQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsTUFBTSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQztBQUVILHNEQUFpRjtBQUNqRix1REFBaUM7QUFDakMsUUFBUSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDM0IsSUFBSSxXQUFtQixDQUFDO0lBQ3hCLE1BQU0sUUFBUSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztJQUV2RSxTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLENBQUMsa0NBQW9CLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDbkgsTUFBTSxDQUFDLGtDQUFvQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ2hFLElBQUksQ0FBQyxjQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUMzRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxVQUFVLEdBQUc7OztHQUdwQixDQUFDO1FBQ0EsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzFFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksc0JBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zcGVjL3RzLWFzdC1xdWVyeVNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgU2VsZWN0b3IsIHtRdWVyeS8qLCBBc3RDaGFyYWN0ZXIqL30gZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3RzLWFzdC1xdWVyeVNwZWMnKTtcblxuZGVzY3JpYmUoJ3RzLWFzdC1xdWVyeScsICgpID0+IHtcbiAgaXQoJ3ByaW50QWxsIGRlbW8nLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnbWFudWFsLXdyaXR0ZW4gc2FtcGxlIGZpbGUnKTtcbiAgICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoJ2ltcG9ydCBhcGkgZnJvbSBcXCdfX2FwaVxcJycsIGZpbGUpO1xuICAgIHNlbC5wcmludEFsbCgpO1xuICAgIGV4cGVjdChzZWwuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uPi5tb2R1bGVTcGVjaWZpZXInKS5sZW5ndGgpLnRvQmUoMSk7XG4gIH0pO1xuXG4gIGl0KCdwcmludEFsbCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbCgpO1xuICB9KTtcblxuICB4aXQoJ3ByaW50QWxsTm9UeXBlIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsTm9UeXBlKCk7XG4gIH0pO1xuXG4gIGl0KCdRdWVyeSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICAvLyBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgLy8gY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBsZXQgcSA9IG5ldyBRdWVyeSgnLnN0YXRlbWVudHM6VmFyaWFibGVTdGF0ZW1lbnQgIC5uYW1lZEJpbmRpbmdzIC5lbGVtZW50c1swXSA+IDpJZGVudGlmaWVyJyk7XG4gICAgY29uc29sZS5sb2cocS5xdWVyeVBhdGhzKTtcbiAgICBleHBlY3QocS5xdWVyeVBhdGhzLnNsaWNlKDApLm1hcChjID0+IGMuc2xpY2UoMCkucmV2ZXJzZSgpKS5yZXZlcnNlKCkpLnRvRXF1YWwoW1xuICAgICAgW3sgcHJvcGVydHlOYW1lOiAnc3RhdGVtZW50cycsIGtpbmQ6ICdWYXJpYWJsZVN0YXRlbWVudCcgfV0sXG4gICAgICBbeyBwcm9wZXJ0eU5hbWU6ICduYW1lZEJpbmRpbmdzJyB9XSxcbiAgICAgIFt7IHByb3BlcnR5TmFtZTogJ2VsZW1lbnRzJywgcHJvcEluZGV4OiAwIH0sIHsga2luZDogJ0lkZW50aWZpZXInIH1dXG4gICAgXSk7XG4gICAgZXhwZWN0KChxIGFzIGFueSkubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoXG4gICAgICAgIFsocSBhcyBhbnkpLl9wYXJzZURlc2MoJy5mb29iYXI6QWJjJyksIChxIGFzIGFueSkuX3BhcnNlRGVzYygnOk9mZicpXS5yZXZlcnNlKCksXG4gICAgICAgIFsnLmZvb2JhclszXTpBYmMnLCAnLmVuZDpPZmYnXSwgMVxuICAgICAgKSkudG9CZSh0cnVlKTtcbiAgICBleHBlY3QoKHEgYXMgYW55KS5tYXRjaGVzQ29uc2VjdXRpdmVOb2RlcyhcbiAgICAgICAgWyhxIGFzIGFueSkuX3BhcnNlRGVzYygnLmZvb2JhcjpBYmMnKSwgKHEgYXMgYW55KS5fcGFyc2VEZXNjKCc6T2ZmJyldLnJldmVyc2UoKSxcbiAgICAgICAgWycuZm9vYmFyWzNdOkFiYycsICcuZW5kOk9mZiddLCAwXG4gICAgICApKS50b0JlKGZhbHNlKTtcblxuICAgIGV4cGVjdChxLm1hdGNoZXMoXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICAnLnN0YXRlbWVudHNbMF06VmFyaWFibGVTdGF0ZW1lbnQ+LmltcG9ydENsYXVzZTpJbXBvcnRDbGF1c2U+Lm5hbWVkQmluZGluZ3M6TmFtZWRJbXBvcnRzPi5lbGVtZW50c1swXTpJbXBvcnRTcGVjaWZpZXI+Lm5hbWU6SWRlbnRpZmllcidcbiAgICAgIC5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcbiAgICBxID0gbmV3IFF1ZXJ5KCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKTtcbiAgICBleHBlY3QocS5tYXRjaGVzKCgnLnN0YXRlbWVudHNbMF06SW1wb3J0RGVjbGFyYXRpb24+LmltcG9ydENsYXVzZTpJbXBvcnRDbGF1c2U+Lm5hbWVkQmluZGluZ3M6TmFtZWRJbXBvcnRzPicgK1xuICAgICAgJy5lbGVtZW50c1swXTpJbXBvcnRTcGVjaWZpZXI+Lm5hbWU6SWRlbnRpZmllcicpLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChxLm1hdGNoZXMoKCcuc3RhdGVtZW50c1swXTpJbXBvcnREZWNsYXJhdGlvbj4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+JyArXG4gICAgICAnLmVsZW1lbnRzWzFdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJykuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG4gIH0pO1xuXG4gIGl0KCdmaW5kRmlyc3Qgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgY29uc3QgZm91bmQgPSBzZWwuZmluZEZpcnN0KCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKTtcbiAgICBleHBlY3QoZm91bmQgIT0gbnVsbCkudG9CZVRydXRoeSgpO1xuICAgIGV4cGVjdChmb3VuZCEuZ2V0VGV4dChzZWwuc3JjKSkudG9CZSgnTmdNb2R1bGUnKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRBbGwgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgY29uc3QgZm91bmQgPSBzZWwuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uIDpJZGVudGlmaWVyJykubWFwKGFzdCA9PiBhc3QuZ2V0VGV4dChzZWwuc3JjKSk7XG5cbiAgICBjb25zb2xlLmxvZyhmb3VuZCk7XG5cbiAgICBleHBlY3QoZm91bmQubGVuZ3RoKS50b0JlKDE4KTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRXaXRoIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGBcblx0XHRwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcblx0XHQgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG5cdFx0YDtcbiAgICBjb25zdCBxdWVyeSA9IG5ldyBTZWxlY3Rvcih0YXJnZXQsICdtYWluLWhtci50cycpO1xuICAgIGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuICAgIHF1ZXJ5LnByaW50QWxsKHF1ZXJ5LnNyYyk7XG4gICAgLy8gY29uc3QgZm91bmQgPSBxdWVyeS5maW5kQWxsKHF1ZXJ5LnNyYyxcbiAgICAvLyAgICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhmb3VuZCk7XG5cbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRXaXRoKHF1ZXJ5LnNyYyxcbiAgICAgICdeLnN0YXRlbWVudHM+OkNhbGxFeHByZXNzaW9uIDpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tPj4+Pi0tLS0tLS0tLS0nKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYXN0LnRleHQsIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpKTtcbiAgICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2hlcmUnKTtcbiAgICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICBleHBlY3QoYm9vdENhbGwgIT0gbnVsbCkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbn0pO1xuXG5pbXBvcnQge3Jlc29sdmVJbXBvcnRCaW5kTmFtZSwgZGVmYXVsdFJlc29sdmVNb2R1bGV9IGZyb20gJy4uL3V0aWxzL3RzLWFzdC11dGlsJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuZGVzY3JpYmUoJ3RzLWFzdC11dGlsJywgKCkgPT4ge1xuICBsZXQgdGVzdENvbnRlbnQ6IHN0cmluZztcbiAgY29uc3QgdGVzdEZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcblxuICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgIHRlc3RDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHRlc3RGaWxlLCAndXRmOCcpO1xuICB9KTtcblxuICBpdCgncmVzb2x2ZU1vZHVsZSgpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGV4cGVjdChkZWZhdWx0UmVzb2x2ZU1vZHVsZSgnLi9hYmMnLCBfX2ZpbGVuYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJykpLnRvQmUoX19kaXJuYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvYWJjJyk7XG4gICAgZXhwZWN0KGRlZmF1bHRSZXNvbHZlTW9kdWxlKCdhYmMnLCBfX2ZpbGVuYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgICAudG9CZShyZXNvbHZlKCdub2RlX21vZHVsZXMvYWJjJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgfSk7XG5cbiAgaXQoJ3Jlc29sdmVJbXBvcnRCaW5kTmFtZScsICgpID0+IHtcbiAgICBjb25zdCBzcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHRlc3RGaWxlLCB0ZXN0Q29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICBjb25zdCByZXMgPSByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjLCAnQGJrL2Vudi9lbnZpcm9ubWVudCcsICdlbnZpcm9ubWVudCcpO1xuICAgIGV4cGVjdChyZXMpLnRvQmUoJ2VudicpO1xuICB9KTtcblxuICBpdCgncmVzb2x2ZUltcG9ydEJpbmROYW1lIGZvciBpbXBvcnQgbmFtZSBzcGFjZSBiaW5kaW5nJywgKCkgPT4ge1xuICAgIGNvbnN0IHRlc3RTYW1wbGUgPSAnaW1wb3J0ICogYXMgbmcgZnJvbSBcIkBhbmd1bGFyL2NvcmVcIjtcXFxuXHRcdFx0QG5nLkNvbXBvbmVudCh7fSlcXFxuXHRcdFx0Y2xhc3MgTXlDb21wb25lbnQge31cXFxuXHRcdCc7XG4gICAgY29uc3Qgc3JjID0gdHMuY3JlYXRlU291cmNlRmlsZSh0ZXN0RmlsZSwgdGVzdFNhbXBsZSwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICBuZXcgU2VsZWN0b3Ioc3JjKS5wcmludEFsbCgpO1xuICAgIGNvbnN0IHJlcyA9IHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmMsICdAYW5ndWxhci9jb3JlJywgJ0NvbXBvbmVudCcpO1xuICAgIGV4cGVjdChyZXMpLnRvQmUoJ25nLkNvbXBvbmVudCcpO1xuICB9KTtcbn0pO1xuXG4iXX0=
