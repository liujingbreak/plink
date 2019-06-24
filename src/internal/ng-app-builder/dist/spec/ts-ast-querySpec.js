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
        let q = new ts_ast_query_1.Query('.statements:VariableStatement .namedBindings .elements[0] > :Identifier');
        console.log(q.queryPaths);
        expect(q.queryPaths).toEqual([
            [{ propertyName: 'statements', kind: 'VariableStatement' }],
            [{ propertyName: 'namedBindings' }],
            [{ propertyName: 'elements', propIndex: 0 }, { kind: 'Identifier' }]
        ]);
        expect(q.matchesConsecutiveNodes([q._parseDesc('.foobar:Abc'), q._parseDesc(':Off')], ['.foobar[3]:Abc', '.end:Off'], 1)).toBe(true);
        expect(q.matchesConsecutiveNodes([q._parseDesc('.foobar:Abc'), q._parseDesc(':Off')], ['.foobar[3]:Abc', '.end:Off'], 0)).toBe(false);
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
        const found = sel.findAll(':ImportDeclaration :Identifier');
        console.log(found.map(ast => ast.getText(sel.src)));
    });
    it('findWith should work', () => {
        const target = `
		platformBrowserDynamic().bootstrapModule(AppModule)
		  .catch(err => console.log(err));
		`;
        const query = new ts_ast_query_1.default(target, 'main-hmr.ts');
        console.log('------>>>>----------');
        // query.printAll(query.src.statements[0]);
        const found = query.findAll(query.src.statements[0], ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier');
        console.log(found);
        const bootCall = query.findWith(query.src.statements[0], ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
            console.log('------>>>>----------');
            console.log(ast.text, ast.parent.parent.name.getText(query.src));
            if (ast.text === 'platformBrowserDynamic' &&
                ast.parent.parent.name.getText(query.src) === 'bootstrapModule' &&
                ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
                console.log('here');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLDhFQUF3RTtBQUN4RSwrQ0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtEQUErRDtBQUUvRCxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUM3QixFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzlELENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUks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QUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc3BlYy90cy1hc3QtcXVlcnlTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IFNlbGVjdG9yLCB7UXVlcnkvKiwgQXN0Q2hhcmFjdGVyKi99IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd0cy1hc3QtcXVlcnlTcGVjJyk7XG5cbmRlc2NyaWJlKCd0cy1hc3QtcXVlcnknLCAoKSA9PiB7XG5cdGl0KCdwcmludEFsbCBkZW1vJywgKCkgPT4ge1xuXHRcdGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJ21hbnVhbC13cml0dGVuIHNhbXBsZSBmaWxlJyk7XG5cdFx0Y29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKCdpbXBvcnQgYXBpIGZyb20gXFwnX19hcGlcXCcnLCBmaWxlKTtcblx0XHRzZWwucHJpbnRBbGwoKTtcblx0XHRleHBlY3Qoc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykubGVuZ3RoKS50b0JlKDEpO1xuXHR9KTtcblxuXHRpdCgncHJpbnRBbGwgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG5cdFx0Y29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuXHRcdG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGwoKTtcblx0fSk7XG5cblx0eGl0KCdwcmludEFsbE5vVHlwZSBzaG91bGQgd29yaycsICgpID0+IHtcblx0XHRjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cdFx0bmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbE5vVHlwZSgpO1xuXHR9KTtcblxuXHRpdCgnUXVlcnkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG5cdFx0Ly8gY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuXHRcdC8vIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG5cdFx0bGV0IHEgPSBuZXcgUXVlcnkoJy5zdGF0ZW1lbnRzOlZhcmlhYmxlU3RhdGVtZW50IC5uYW1lZEJpbmRpbmdzIC5lbGVtZW50c1swXSA+IDpJZGVudGlmaWVyJyk7XG5cdFx0Y29uc29sZS5sb2cocS5xdWVyeVBhdGhzKTtcblx0XHRleHBlY3QocS5xdWVyeVBhdGhzKS50b0VxdWFsKFtcblx0XHRcdFt7IHByb3BlcnR5TmFtZTogJ3N0YXRlbWVudHMnLCBraW5kOiAnVmFyaWFibGVTdGF0ZW1lbnQnIH1dLFxuXHRcdFx0W3sgcHJvcGVydHlOYW1lOiAnbmFtZWRCaW5kaW5ncycgfV0sXG5cdFx0XHRbeyBwcm9wZXJ0eU5hbWU6ICdlbGVtZW50cycsIHByb3BJbmRleDogMCB9LCB7IGtpbmQ6ICdJZGVudGlmaWVyJyB9XVxuXHRcdF0pO1xuXHRcdGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuXHRcdFx0XHRbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0sIFsnLmZvb2JhclszXTpBYmMnLCAnLmVuZDpPZmYnXSwgMVxuXHRcdFx0KSkudG9CZSh0cnVlKTtcblx0XHRleHBlY3QoKHEgYXMgYW55KS5tYXRjaGVzQ29uc2VjdXRpdmVOb2Rlcyhcblx0XHRcdFx0WyhxIGFzIGFueSkuX3BhcnNlRGVzYygnLmZvb2JhcjpBYmMnKSwgKHEgYXMgYW55KS5fcGFyc2VEZXNjKCc6T2ZmJyldLCBbJy5mb29iYXJbM106QWJjJywgJy5lbmQ6T2ZmJ10sIDBcblx0XHRcdCkpLnRvQmUoZmFsc2UpO1xuXG5cdFx0ZXhwZWN0KHEubWF0Y2hlcyhcblx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcblx0XHRcdCcuc3RhdGVtZW50c1swXTpWYXJpYWJsZVN0YXRlbWVudD4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+LmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJ1xuXHRcdFx0LnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuXHRcdHEgPSBuZXcgUXVlcnkoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuXHRcdGV4cGVjdChxLm1hdGNoZXMoKCcuc3RhdGVtZW50c1swXTpJbXBvcnREZWNsYXJhdGlvbj4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+JyArXG5cdFx0XHQnLmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJykuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG5cdFx0ZXhwZWN0KHEubWF0Y2hlcygoJy5zdGF0ZW1lbnRzWzBdOkltcG9ydERlY2xhcmF0aW9uPi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4nICtcblx0XHRcdCcuZWxlbWVudHNbMV06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInKS5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcblx0fSk7XG5cblx0aXQoJ2ZpbmRGaXJzdCBzaG91bGQgd29yaycsICgpID0+IHtcblx0XHRjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cdFx0Y29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcblx0XHRjb25zdCBmb3VuZCA9IHNlbC5maW5kRmlyc3QoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuXHRcdGV4cGVjdChmb3VuZCAhPSBudWxsKS50b0JlVHJ1dGh5KCk7XG5cdFx0ZXhwZWN0KGZvdW5kIS5nZXRUZXh0KHNlbC5zcmMpKS50b0JlKCdOZ01vZHVsZScpO1xuXHR9KTtcblxuXHRpdCgnZmluZEFsbCBzaG91bGQgd29yaycsICgpID0+IHtcblx0XHRjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cdFx0Y29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcblx0XHRjb25zdCBmb3VuZCA9IHNlbC5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKTtcblx0XHRjb25zb2xlLmxvZyhmb3VuZC5tYXAoYXN0ID0+IGFzdC5nZXRUZXh0KHNlbC5zcmMpKSk7XG5cdH0pO1xuXG5cdGl0KCdmaW5kV2l0aCBzaG91bGQgd29yaycsICgpID0+IHtcblx0XHRjb25zdCB0YXJnZXQgPSBgXG5cdFx0cGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXG5cdFx0ICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuXHRcdGA7XG5cdFx0Y29uc3QgcXVlcnkgPSBuZXcgU2VsZWN0b3IodGFyZ2V0LCAnbWFpbi1obXIudHMnKTtcblx0XHRjb25zb2xlLmxvZygnLS0tLS0tPj4+Pi0tLS0tLS0tLS0nKTtcblx0XHQvLyBxdWVyeS5wcmludEFsbChxdWVyeS5zcmMuc3RhdGVtZW50c1swXSk7XG5cdFx0Y29uc3QgZm91bmQgPSBxdWVyeS5maW5kQWxsKHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzWzBdLFxuXHRcdFx0JzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInKTtcblxuXHRcdGNvbnNvbGUubG9nKGZvdW5kKTtcblxuXHRcdGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZFdpdGgocXVlcnkuc3JjLnN0YXRlbWVudHNbMF0sXG5cdFx0XHQnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG5cdFx0XHQoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhhc3QudGV4dCwgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykpO1xuXHRcdFx0XHRpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuXHRcdFx0XHQoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcblx0XHRcdFx0YXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnaGVyZScpO1xuXHRcdFx0XHRcdHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdGV4cGVjdChib290Q2FsbCAhPSBudWxsKS50b0JlKHRydWUpO1xuXHR9KTtcblxufSk7XG5cbmltcG9ydCB7cmVzb2x2ZUltcG9ydEJpbmROYW1lLCBkZWZhdWx0UmVzb2x2ZU1vZHVsZX0gZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXV0aWwnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5kZXNjcmliZSgndHMtYXN0LXV0aWwnLCAoKSA9PiB7XG5cdGxldCB0ZXN0Q29udGVudDogc3RyaW5nO1xuXHRjb25zdCB0ZXN0RmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuXG5cdGJlZm9yZUFsbCgoKSA9PiB7XG5cdFx0dGVzdENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModGVzdEZpbGUsICd1dGY4Jyk7XG5cdH0pO1xuXG5cdGl0KCdyZXNvbHZlTW9kdWxlKCkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG5cdFx0ZXhwZWN0KGRlZmF1bHRSZXNvbHZlTW9kdWxlKCcuL2FiYycsIF9fZmlsZW5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkudG9CZShfX2Rpcm5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy9hYmMnKTtcblx0XHRleHBlY3QoZGVmYXVsdFJlc29sdmVNb2R1bGUoJ2FiYycsIF9fZmlsZW5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcblx0XHRcdC50b0JlKHJlc29sdmUoJ25vZGVfbW9kdWxlcy9hYmMnKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuXHR9KTtcblxuXHRpdCgncmVzb2x2ZUltcG9ydEJpbmROYW1lJywgKCkgPT4ge1xuXHRcdGNvbnN0IHNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUodGVzdEZpbGUsIHRlc3RDb250ZW50LCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuXHRcdFx0dHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuXHRcdGNvbnN0IHJlcyA9IHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmMsICdAYmsvZW52L2Vudmlyb25tZW50JywgJ2Vudmlyb25tZW50Jyk7XG5cdFx0ZXhwZWN0KHJlcykudG9CZSgnZW52Jyk7XG5cdH0pO1xuXG5cdGl0KCdyZXNvbHZlSW1wb3J0QmluZE5hbWUgZm9yIGltcG9ydCBuYW1lIHNwYWNlIGJpbmRpbmcnLCAoKSA9PiB7XG5cdFx0Y29uc3QgdGVzdFNhbXBsZSA9ICdpbXBvcnQgKiBhcyBuZyBmcm9tIFwiQGFuZ3VsYXIvY29yZVwiO1xcXG5cdFx0XHRAbmcuQ29tcG9uZW50KHt9KVxcXG5cdFx0XHRjbGFzcyBNeUNvbXBvbmVudCB7fVxcXG5cdFx0Jztcblx0XHRjb25zdCBzcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHRlc3RGaWxlLCB0ZXN0U2FtcGxlLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuXHRcdFx0dHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuXHRcdG5ldyBTZWxlY3RvcihzcmMpLnByaW50QWxsKCk7XG5cdFx0Y29uc3QgcmVzID0gcmVzb2x2ZUltcG9ydEJpbmROYW1lKHNyYywgJ0Bhbmd1bGFyL2NvcmUnLCAnQ29tcG9uZW50Jyk7XG5cdFx0ZXhwZWN0KHJlcykudG9CZSgnbmcuQ29tcG9uZW50Jyk7XG5cdH0pO1xufSk7XG5cbiJdfQ==
