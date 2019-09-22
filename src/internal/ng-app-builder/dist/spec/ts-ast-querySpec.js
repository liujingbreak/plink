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
        const res = ts_ast_util_1.resolveImportBindName(src, '@angular/core', 'Injectable');
        expect(res).toBe('Injectable');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLDhFQUF3RTtBQUN4RSwrQ0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtEQUErRDtBQUUvRCxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUM1QixFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMzQixzRUFBc0U7UUFDdEUsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxHQUFHLElBQUksb0JBQUssQ0FBQywwRUFBMEUsQ0FBQyxDQUFDO1FBQzlGLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDN0UsQ0FBQyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUM7WUFDM0QsQ0FBQyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsQ0FBQztZQUNuQyxDQUFDLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUM7U0FDckUsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFFLENBQVMsQ0FBQyx1QkFBdUIsQ0FDckMsQ0FBRSxDQUFTLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFHLENBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFDL0UsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsTUFBTSxDQUFFLENBQVMsQ0FBQyx1QkFBdUIsQ0FDckMsQ0FBRSxDQUFTLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFHLENBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFDL0UsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFakIsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPO1FBQ2QsMkNBQTJDO1FBQzNDLHVJQUF1STthQUN0SSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixDQUFDLEdBQUcsSUFBSSxvQkFBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQywwRkFBMEY7WUFDMUcsK0NBQStDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLDBGQUEwRjtZQUMxRywrQ0FBK0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxLQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNyRCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUU3RixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRW5CLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLE1BQU0sR0FBRzs7O0dBR2hCLENBQUM7UUFDQSxNQUFNLEtBQUssR0FBRyxJQUFJLHNCQUFRLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQix5Q0FBeUM7UUFDekMsd0ZBQXdGO1FBRXhGLHNCQUFzQjtRQUV0QixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQ3ZDLDhHQUE4RyxFQUM5RyxDQUFDLEdBQWtCLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3BDLHVDQUF1QztZQUN2QyxxR0FBcUc7WUFDckcsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHdCQUF3QjtnQkFDeEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFzQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLGlCQUFpQjtnQkFDaEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRTtnQkFDOUQsdUJBQXVCO2dCQUN2QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNqQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsTUFBTSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQztBQUVILHNEQUFpRjtBQUNqRix1REFBaUM7QUFDakMsUUFBUSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDM0IsSUFBSSxXQUFtQixDQUFDO0lBQ3hCLE1BQU0sUUFBUSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztJQUV2RSxTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLENBQUMsa0NBQW9CLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDbkgsTUFBTSxDQUFDLGtDQUFvQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ2hFLElBQUksQ0FBQyxjQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUMzRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBQzdELE1BQU0sVUFBVSxHQUFHOzs7R0FHcEIsQ0FBQztRQUNBLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUMxRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDN0IsTUFBTSxHQUFHLEdBQUcsbUNBQXFCLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc3BlYy90cy1hc3QtcXVlcnlTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IFNlbGVjdG9yLCB7UXVlcnkvKiwgQXN0Q2hhcmFjdGVyKi99IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd0cy1hc3QtcXVlcnlTcGVjJyk7XG5cbmRlc2NyaWJlKCd0cy1hc3QtcXVlcnknLCAoKSA9PiB7XG4gIGl0KCdwcmludEFsbCBkZW1vJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJ21hbnVhbC13cml0dGVuIHNhbXBsZSBmaWxlJyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKCdpbXBvcnQgYXBpIGZyb20gXFwnX19hcGlcXCcnLCBmaWxlKTtcbiAgICBzZWwucHJpbnRBbGwoKTtcbiAgICBleHBlY3Qoc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykubGVuZ3RoKS50b0JlKDEpO1xuICB9KTtcblxuICBpdCgncHJpbnRBbGwgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGwoKTtcbiAgfSk7XG5cbiAgeGl0KCdwcmludEFsbE5vVHlwZSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbE5vVHlwZSgpO1xuICB9KTtcblxuICBpdCgnUXVlcnkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgLy8gY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIC8vIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgbGV0IHEgPSBuZXcgUXVlcnkoJy5zdGF0ZW1lbnRzOlZhcmlhYmxlU3RhdGVtZW50ICAubmFtZWRCaW5kaW5ncyAuZWxlbWVudHNbMF0gPiA6SWRlbnRpZmllcicpO1xuICAgIGNvbnNvbGUubG9nKHEucXVlcnlQYXRocyk7XG4gICAgZXhwZWN0KHEucXVlcnlQYXRocy5zbGljZSgwKS5tYXAoYyA9PiBjLnNsaWNlKDApLnJldmVyc2UoKSkucmV2ZXJzZSgpKS50b0VxdWFsKFtcbiAgICAgIFt7IHByb3BlcnR5TmFtZTogJ3N0YXRlbWVudHMnLCBraW5kOiAnVmFyaWFibGVTdGF0ZW1lbnQnIH1dLFxuICAgICAgW3sgcHJvcGVydHlOYW1lOiAnbmFtZWRCaW5kaW5ncycgfV0sXG4gICAgICBbeyBwcm9wZXJ0eU5hbWU6ICdlbGVtZW50cycsIHByb3BJbmRleDogMCB9LCB7IGtpbmQ6ICdJZGVudGlmaWVyJyB9XVxuICAgIF0pO1xuICAgIGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuICAgICAgICBbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0ucmV2ZXJzZSgpLFxuICAgICAgICBbJy5mb29iYXJbM106QWJjJywgJy5lbmQ6T2ZmJ10sIDFcbiAgICAgICkpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KChxIGFzIGFueSkubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoXG4gICAgICAgIFsocSBhcyBhbnkpLl9wYXJzZURlc2MoJy5mb29iYXI6QWJjJyksIChxIGFzIGFueSkuX3BhcnNlRGVzYygnOk9mZicpXS5yZXZlcnNlKCksXG4gICAgICAgIFsnLmZvb2JhclszXTpBYmMnLCAnLmVuZDpPZmYnXSwgMFxuICAgICAgKSkudG9CZShmYWxzZSk7XG5cbiAgICBleHBlY3QocS5tYXRjaGVzKFxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAgICAgJy5zdGF0ZW1lbnRzWzBdOlZhcmlhYmxlU3RhdGVtZW50Pi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4uZWxlbWVudHNbMF06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInXG4gICAgICAuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG4gICAgcSA9IG5ldyBRdWVyeSgnOkltcG9ydERlY2xhcmF0aW9uIDpJZGVudGlmaWVyJyk7XG4gICAgZXhwZWN0KHEubWF0Y2hlcygoJy5zdGF0ZW1lbnRzWzBdOkltcG9ydERlY2xhcmF0aW9uPi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4nICtcbiAgICAgICcuZWxlbWVudHNbMF06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInKS5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcbiAgICBleHBlY3QocS5tYXRjaGVzKCgnLnN0YXRlbWVudHNbMF06SW1wb3J0RGVjbGFyYXRpb24+LmltcG9ydENsYXVzZTpJbXBvcnRDbGF1c2U+Lm5hbWVkQmluZGluZ3M6TmFtZWRJbXBvcnRzPicgK1xuICAgICAgJy5lbGVtZW50c1sxXTpJbXBvcnRTcGVjaWZpZXI+Lm5hbWU6SWRlbnRpZmllcicpLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuICB9KTtcblxuICBpdCgnZmluZEZpcnN0IHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIGNvbnN0IGZvdW5kID0gc2VsLmZpbmRGaXJzdCgnOkltcG9ydERlY2xhcmF0aW9uIDpJZGVudGlmaWVyJyk7XG4gICAgZXhwZWN0KGZvdW5kICE9IG51bGwpLnRvQmVUcnV0aHkoKTtcbiAgICBleHBlY3QoZm91bmQhLmdldFRleHQoc2VsLnNyYykpLnRvQmUoJ0luamVjdGFibGUnKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRBbGwgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgY29uc3QgZm91bmQgPSBzZWwuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uIDpJZGVudGlmaWVyJykubWFwKGFzdCA9PiBhc3QuZ2V0VGV4dChzZWwuc3JjKSk7XG5cbiAgICBjb25zb2xlLmxvZyhmb3VuZCk7XG5cbiAgICBleHBlY3QoZm91bmQubGVuZ3RoKS50b0JlKDEpO1xuICB9KTtcblxuICBpdCgnZmluZFdpdGggc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYFxuXHRcdHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKVxuXHRcdCAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcblx0XHRgO1xuICAgIGNvbnN0IHF1ZXJ5ID0gbmV3IFNlbGVjdG9yKHRhcmdldCwgJ21haW4taG1yLnRzJyk7XG4gICAgY29uc29sZS5sb2coJy0tLS0tLT4+Pj4tLS0tLS0tLS0tJyk7XG4gICAgcXVlcnkucHJpbnRBbGwocXVlcnkuc3JjKTtcbiAgICAvLyBjb25zdCBmb3VuZCA9IHF1ZXJ5LmZpbmRBbGwocXVlcnkuc3JjLFxuICAgIC8vICAgJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKGZvdW5kKTtcblxuICAgIGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZFdpdGgocXVlcnkuc3JjLFxuICAgICAgJ14uc3RhdGVtZW50cz46Q2FsbEV4cHJlc3Npb24gOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhhc3QudGV4dCwgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykpO1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGVyZScpO1xuICAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGV4cGVjdChib290Q2FsbCAhPSBudWxsKS50b0JlKHRydWUpO1xuICB9KTtcblxufSk7XG5cbmltcG9ydCB7cmVzb2x2ZUltcG9ydEJpbmROYW1lLCBkZWZhdWx0UmVzb2x2ZU1vZHVsZX0gZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXV0aWwnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5kZXNjcmliZSgndHMtYXN0LXV0aWwnLCAoKSA9PiB7XG4gIGxldCB0ZXN0Q29udGVudDogc3RyaW5nO1xuICBjb25zdCB0ZXN0RmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuXG4gIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgdGVzdENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModGVzdEZpbGUsICd1dGY4Jyk7XG4gIH0pO1xuXG4gIGl0KCdyZXNvbHZlTW9kdWxlKCkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgZXhwZWN0KGRlZmF1bHRSZXNvbHZlTW9kdWxlKCcuL2FiYycsIF9fZmlsZW5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkudG9CZShfX2Rpcm5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy9hYmMnKTtcbiAgICBleHBlY3QoZGVmYXVsdFJlc29sdmVNb2R1bGUoJ2FiYycsIF9fZmlsZW5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgICAgIC50b0JlKHJlc29sdmUoJ25vZGVfbW9kdWxlcy9hYmMnKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICB9KTtcblxuICBpdCgncmVzb2x2ZUltcG9ydEJpbmROYW1lJywgKCkgPT4ge1xuICAgIGNvbnN0IHNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUodGVzdEZpbGUsIHRlc3RDb250ZW50LCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIGNvbnN0IHJlcyA9IHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmMsICdAYW5ndWxhci9jb3JlJywgJ0luamVjdGFibGUnKTtcbiAgICBleHBlY3QocmVzKS50b0JlKCdJbmplY3RhYmxlJyk7XG4gIH0pO1xuXG4gIGl0KCdyZXNvbHZlSW1wb3J0QmluZE5hbWUgZm9yIGltcG9ydCBuYW1lIHNwYWNlIGJpbmRpbmcnLCAoKSA9PiB7XG4gICAgY29uc3QgdGVzdFNhbXBsZSA9ICdpbXBvcnQgKiBhcyBuZyBmcm9tIFwiQGFuZ3VsYXIvY29yZVwiO1xcXG5cdFx0XHRAbmcuQ29tcG9uZW50KHt9KVxcXG5cdFx0XHRjbGFzcyBNeUNvbXBvbmVudCB7fVxcXG5cdFx0JztcbiAgICBjb25zdCBzcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHRlc3RGaWxlLCB0ZXN0U2FtcGxlLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIG5ldyBTZWxlY3RvcihzcmMpLnByaW50QWxsKCk7XG4gICAgY29uc3QgcmVzID0gcmVzb2x2ZUltcG9ydEJpbmROYW1lKHNyYywgJ0Bhbmd1bGFyL2NvcmUnLCAnQ29tcG9uZW50Jyk7XG4gICAgZXhwZWN0KHJlcykudG9CZSgnbmcuQ29tcG9uZW50Jyk7XG4gIH0pO1xufSk7XG5cbiJdfQ==
