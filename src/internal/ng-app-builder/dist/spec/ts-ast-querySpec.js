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
        expect(found.getText(sel.src)).toBe('NgModule');
    });
    it('findAll should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        const sel = new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file);
        const found = sel.findAll(':ImportDeclaration :Identifier');
        console.log(found.map(ast => ast.getText(sel.src)));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLDhFQUF3RTtBQUN4RSwrQ0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtEQUErRDtBQUUvRCxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUM3QixFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzlELENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUks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Q0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUM1RSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQixNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDOUQsTUFBTSxVQUFVLEdBQUc7OztHQUdsQixDQUFDO1FBQ0YsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzNFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLElBQUksc0JBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zcGVjL3RzLWFzdC1xdWVyeVNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgU2VsZWN0b3IsIHtRdWVyeS8qLCBBc3RDaGFyYWN0ZXIqL30gZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3RzLWFzdC1xdWVyeVNwZWMnKTtcblxuZGVzY3JpYmUoJ3RzLWFzdC1xdWVyeScsICgpID0+IHtcblx0aXQoJ3ByaW50QWxsIGRlbW8nLCAoKSA9PiB7XG5cdFx0Y29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnbWFudWFsLXdyaXR0ZW4gc2FtcGxlIGZpbGUnKTtcblx0XHRjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoJ2ltcG9ydCBhcGkgZnJvbSBcXCdfX2FwaVxcJycsIGZpbGUpO1xuXHRcdHNlbC5wcmludEFsbCgpO1xuXHRcdGV4cGVjdChzZWwuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uPi5tb2R1bGVTcGVjaWZpZXInKS5sZW5ndGgpLnRvQmUoMSk7XG5cdH0pO1xuXG5cdGl0KCdwcmludEFsbCBzaG91bGQgd29yaycsICgpID0+IHtcblx0XHRjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cdFx0bmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbCgpO1xuXHR9KTtcblxuXHR4aXQoJ3ByaW50QWxsTm9UeXBlIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuXHRcdGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcblx0XHRuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsTm9UeXBlKCk7XG5cdH0pO1xuXG5cdGl0KCdRdWVyeSBzaG91bGQgd29yaycsICgpID0+IHtcblx0XHQvLyBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cdFx0Ly8gY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcblx0XHRsZXQgcSA9IG5ldyBRdWVyeSgnLnN0YXRlbWVudHM6VmFyaWFibGVTdGF0ZW1lbnQgLm5hbWVkQmluZGluZ3MgLmVsZW1lbnRzWzBdID4gOklkZW50aWZpZXInKTtcblx0XHRjb25zb2xlLmxvZyhxLnF1ZXJ5UGF0aHMpO1xuXHRcdGV4cGVjdChxLnF1ZXJ5UGF0aHMpLnRvRXF1YWwoW1xuXHRcdFx0W3sgcHJvcGVydHlOYW1lOiAnc3RhdGVtZW50cycsIGtpbmQ6ICdWYXJpYWJsZVN0YXRlbWVudCcgfV0sXG5cdFx0XHRbeyBwcm9wZXJ0eU5hbWU6ICduYW1lZEJpbmRpbmdzJyB9XSxcblx0XHRcdFt7IHByb3BlcnR5TmFtZTogJ2VsZW1lbnRzJywgcHJvcEluZGV4OiAwIH0sIHsga2luZDogJ0lkZW50aWZpZXInIH1dXG5cdFx0XSk7XG5cdFx0ZXhwZWN0KChxIGFzIGFueSkubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoXG5cdFx0XHRcdFsocSBhcyBhbnkpLl9wYXJzZURlc2MoJy5mb29iYXI6QWJjJyksIChxIGFzIGFueSkuX3BhcnNlRGVzYygnOk9mZicpXSwgWycuZm9vYmFyWzNdOkFiYycsICcuZW5kOk9mZiddLCAxXG5cdFx0XHQpKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuXHRcdFx0XHRbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0sIFsnLmZvb2JhclszXTpBYmMnLCAnLmVuZDpPZmYnXSwgMFxuXHRcdFx0KSkudG9CZShmYWxzZSk7XG5cblx0XHRleHBlY3QocS5tYXRjaGVzKFxuXHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuXHRcdFx0Jy5zdGF0ZW1lbnRzWzBdOlZhcmlhYmxlU3RhdGVtZW50Pi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4uZWxlbWVudHNbMF06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInXG5cdFx0XHQuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG5cdFx0cSA9IG5ldyBRdWVyeSgnOkltcG9ydERlY2xhcmF0aW9uIDpJZGVudGlmaWVyJyk7XG5cdFx0ZXhwZWN0KHEubWF0Y2hlcygoJy5zdGF0ZW1lbnRzWzBdOkltcG9ydERlY2xhcmF0aW9uPi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4nICtcblx0XHRcdCcuZWxlbWVudHNbMF06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInKS5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcblx0XHRleHBlY3QocS5tYXRjaGVzKCgnLnN0YXRlbWVudHNbMF06SW1wb3J0RGVjbGFyYXRpb24+LmltcG9ydENsYXVzZTpJbXBvcnRDbGF1c2U+Lm5hbWVkQmluZGluZ3M6TmFtZWRJbXBvcnRzPicgK1xuXHRcdFx0Jy5lbGVtZW50c1sxXTpJbXBvcnRTcGVjaWZpZXI+Lm5hbWU6SWRlbnRpZmllcicpLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuXHR9KTtcblxuXHRpdCgnZmluZEZpcnN0IHNob3VsZCB3b3JrJywgKCkgPT4ge1xuXHRcdGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcblx0XHRjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuXHRcdGNvbnN0IGZvdW5kID0gc2VsLmZpbmRGaXJzdCgnOkltcG9ydERlY2xhcmF0aW9uIDpJZGVudGlmaWVyJyk7XG5cdFx0ZXhwZWN0KGZvdW5kLmdldFRleHQoc2VsLnNyYykpLnRvQmUoJ05nTW9kdWxlJyk7XG5cdH0pO1xuXG5cdGl0KCdmaW5kQWxsIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuXHRcdGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcblx0XHRjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuXHRcdGNvbnN0IGZvdW5kID0gc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuXHRcdGNvbnNvbGUubG9nKGZvdW5kLm1hcChhc3QgPT4gYXN0LmdldFRleHQoc2VsLnNyYykpKTtcblx0fSk7XG5cbn0pO1xuXG5pbXBvcnQge3Jlc29sdmVJbXBvcnRCaW5kTmFtZSwgZGVmYXVsdFJlc29sdmVNb2R1bGV9IGZyb20gJy4uL3V0aWxzL3RzLWFzdC11dGlsJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuZGVzY3JpYmUoJ3RzLWFzdC11dGlsJywgKCkgPT4ge1xuXHRsZXQgdGVzdENvbnRlbnQ6IHN0cmluZztcblx0Y29uc3QgdGVzdEZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcblxuXHRiZWZvcmVBbGwoKCkgPT4ge1xuXHRcdHRlc3RDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHRlc3RGaWxlLCAndXRmOCcpO1xuXHR9KTtcblxuXHRpdCgncmVzb2x2ZU1vZHVsZSgpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuXHRcdGV4cGVjdChkZWZhdWx0UmVzb2x2ZU1vZHVsZSgnLi9hYmMnLCBfX2ZpbGVuYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJykpLnRvQmUoX19kaXJuYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvYWJjJyk7XG5cdFx0ZXhwZWN0KGRlZmF1bHRSZXNvbHZlTW9kdWxlKCdhYmMnLCBfX2ZpbGVuYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG5cdFx0XHQudG9CZShyZXNvbHZlKCdub2RlX21vZHVsZXMvYWJjJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcblx0fSk7XG5cblx0aXQoJ3Jlc29sdmVJbXBvcnRCaW5kTmFtZScsICgpID0+IHtcblx0XHRjb25zdCBzcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHRlc3RGaWxlLCB0ZXN0Q29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcblx0XHRcdHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcblx0XHRjb25zdCByZXMgPSByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjLCAnQGJrL2Vudi9lbnZpcm9ubWVudCcsICdlbnZpcm9ubWVudCcpO1xuXHRcdGV4cGVjdChyZXMpLnRvQmUoJ2VudicpO1xuXHR9KTtcblxuXHRpdCgncmVzb2x2ZUltcG9ydEJpbmROYW1lIGZvciBpbXBvcnQgbmFtZSBzcGFjZSBiaW5kaW5nJywgKCkgPT4ge1xuXHRcdGNvbnN0IHRlc3RTYW1wbGUgPSAnaW1wb3J0ICogYXMgbmcgZnJvbSBcIkBhbmd1bGFyL2NvcmVcIjtcXFxuXHRcdFx0QG5nLkNvbXBvbmVudCh7fSlcXFxuXHRcdFx0Y2xhc3MgTXlDb21wb25lbnQge31cXFxuXHRcdCc7XG5cdFx0Y29uc3Qgc3JjID0gdHMuY3JlYXRlU291cmNlRmlsZSh0ZXN0RmlsZSwgdGVzdFNhbXBsZSwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcblx0XHRcdHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcblx0XHRuZXcgU2VsZWN0b3Ioc3JjKS5wcmludEFsbCgpO1xuXHRcdGNvbnN0IHJlcyA9IHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmMsICdAYW5ndWxhci9jb3JlJywgJ0NvbXBvbmVudCcpO1xuXHRcdGV4cGVjdChyZXMpLnRvQmUoJ25nLkNvbXBvbmVudCcpO1xuXHR9KTtcbn0pO1xuXG4iXX0=
