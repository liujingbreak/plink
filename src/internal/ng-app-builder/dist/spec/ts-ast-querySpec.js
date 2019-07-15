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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLDhFQUF3RTtBQUN4RSwrQ0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtEQUErRDtBQUUvRCxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUM1QixFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxzQkFBUSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLElBQUksR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUks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LENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFDM0UsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsTUFBTSxHQUFHLEdBQUcsbUNBQXFCLENBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBQzdELE1BQU0sVUFBVSxHQUFHOzs7R0FHcEIsQ0FBQztRQUNBLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUMxRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixJQUFJLHNCQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDN0IsTUFBTSxHQUFHLEdBQUcsbUNBQXFCLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc3BlYy90cy1hc3QtcXVlcnlTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IFNlbGVjdG9yLCB7UXVlcnkvKiwgQXN0Q2hhcmFjdGVyKi99IGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd0cy1hc3QtcXVlcnlTcGVjJyk7XG5cbmRlc2NyaWJlKCd0cy1hc3QtcXVlcnknLCAoKSA9PiB7XG4gIGl0KCdwcmludEFsbCBkZW1vJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJ21hbnVhbC13cml0dGVuIHNhbXBsZSBmaWxlJyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKCdpbXBvcnQgYXBpIGZyb20gXFwnX19hcGlcXCcnLCBmaWxlKTtcbiAgICBzZWwucHJpbnRBbGwoKTtcbiAgICBleHBlY3Qoc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykubGVuZ3RoKS50b0JlKDEpO1xuICB9KTtcblxuICBpdCgncHJpbnRBbGwgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGwoKTtcbiAgfSk7XG5cbiAgeGl0KCdwcmludEFsbE5vVHlwZSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbE5vVHlwZSgpO1xuICB9KTtcblxuICBpdCgnUXVlcnkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgLy8gY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIC8vIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgbGV0IHEgPSBuZXcgUXVlcnkoJy5zdGF0ZW1lbnRzOlZhcmlhYmxlU3RhdGVtZW50IC5uYW1lZEJpbmRpbmdzIC5lbGVtZW50c1swXSA+IDpJZGVudGlmaWVyJyk7XG4gICAgY29uc29sZS5sb2cocS5xdWVyeVBhdGhzKTtcbiAgICBleHBlY3QocS5xdWVyeVBhdGhzKS50b0VxdWFsKFtcbiAgICAgIFt7IHByb3BlcnR5TmFtZTogJ3N0YXRlbWVudHMnLCBraW5kOiAnVmFyaWFibGVTdGF0ZW1lbnQnIH1dLFxuICAgICAgW3sgcHJvcGVydHlOYW1lOiAnbmFtZWRCaW5kaW5ncycgfV0sXG4gICAgICBbeyBwcm9wZXJ0eU5hbWU6ICdlbGVtZW50cycsIHByb3BJbmRleDogMCB9LCB7IGtpbmQ6ICdJZGVudGlmaWVyJyB9XVxuICAgIF0pO1xuICAgIGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuICAgICAgICBbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0sIFsnLmZvb2JhclszXTpBYmMnLCAnLmVuZDpPZmYnXSwgMVxuICAgICAgKSkudG9CZSh0cnVlKTtcbiAgICBleHBlY3QoKHEgYXMgYW55KS5tYXRjaGVzQ29uc2VjdXRpdmVOb2RlcyhcbiAgICAgICAgWyhxIGFzIGFueSkuX3BhcnNlRGVzYygnLmZvb2JhcjpBYmMnKSwgKHEgYXMgYW55KS5fcGFyc2VEZXNjKCc6T2ZmJyldLCBbJy5mb29iYXJbM106QWJjJywgJy5lbmQ6T2ZmJ10sIDBcbiAgICAgICkpLnRvQmUoZmFsc2UpO1xuXG4gICAgZXhwZWN0KHEubWF0Y2hlcyhcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgICcuc3RhdGVtZW50c1swXTpWYXJpYWJsZVN0YXRlbWVudD4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+LmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJ1xuICAgICAgLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuICAgIHEgPSBuZXcgUXVlcnkoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuICAgIGV4cGVjdChxLm1hdGNoZXMoKCcuc3RhdGVtZW50c1swXTpJbXBvcnREZWNsYXJhdGlvbj4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+JyArXG4gICAgICAnLmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJykuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHEubWF0Y2hlcygoJy5zdGF0ZW1lbnRzWzBdOkltcG9ydERlY2xhcmF0aW9uPi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4nICtcbiAgICAgICcuZWxlbWVudHNbMV06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInKS5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRGaXJzdCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBjb25zdCBmb3VuZCA9IHNlbC5maW5kRmlyc3QoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuICAgIGV4cGVjdChmb3VuZC5nZXRUZXh0KHNlbC5zcmMpKS50b0JlKCdOZ01vZHVsZScpO1xuICB9KTtcblxuICBpdCgnZmluZEFsbCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBjb25zdCBmb3VuZCA9IHNlbC5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKTtcbiAgICBjb25zb2xlLmxvZyhmb3VuZC5tYXAoYXN0ID0+IGFzdC5nZXRUZXh0KHNlbC5zcmMpKSk7XG4gIH0pO1xuXG59KTtcblxuaW1wb3J0IHtyZXNvbHZlSW1wb3J0QmluZE5hbWUsIGRlZmF1bHRSZXNvbHZlTW9kdWxlfSBmcm9tICcuLi91dGlscy90cy1hc3QtdXRpbCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmRlc2NyaWJlKCd0cy1hc3QtdXRpbCcsICgpID0+IHtcbiAgbGV0IHRlc3RDb250ZW50OiBzdHJpbmc7XG4gIGNvbnN0IHRlc3RGaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cbiAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICB0ZXN0Q29udGVudCA9IGZzLnJlYWRGaWxlU3luYyh0ZXN0RmlsZSwgJ3V0ZjgnKTtcbiAgfSk7XG5cbiAgaXQoJ3Jlc29sdmVNb2R1bGUoKSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBleHBlY3QoZGVmYXVsdFJlc29sdmVNb2R1bGUoJy4vYWJjJywgX19maWxlbmFtZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKS50b0JlKF9fZGlybmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL2FiYycpO1xuICAgIGV4cGVjdChkZWZhdWx0UmVzb2x2ZU1vZHVsZSgnYWJjJywgX19maWxlbmFtZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKVxuICAgICAgLnRvQmUocmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2FiYycpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH0pO1xuXG4gIGl0KCdyZXNvbHZlSW1wb3J0QmluZE5hbWUnLCAoKSA9PiB7XG4gICAgY29uc3Qgc3JjID0gdHMuY3JlYXRlU291cmNlRmlsZSh0ZXN0RmlsZSwgdGVzdENvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgY29uc3QgcmVzID0gcmVzb2x2ZUltcG9ydEJpbmROYW1lKHNyYywgJ0Biay9lbnYvZW52aXJvbm1lbnQnLCAnZW52aXJvbm1lbnQnKTtcbiAgICBleHBlY3QocmVzKS50b0JlKCdlbnYnKTtcbiAgfSk7XG5cbiAgaXQoJ3Jlc29sdmVJbXBvcnRCaW5kTmFtZSBmb3IgaW1wb3J0IG5hbWUgc3BhY2UgYmluZGluZycsICgpID0+IHtcbiAgICBjb25zdCB0ZXN0U2FtcGxlID0gJ2ltcG9ydCAqIGFzIG5nIGZyb20gXCJAYW5ndWxhci9jb3JlXCI7XFxcblx0XHRcdEBuZy5Db21wb25lbnQoe30pXFxcblx0XHRcdGNsYXNzIE15Q29tcG9uZW50IHt9XFxcblx0XHQnO1xuICAgIGNvbnN0IHNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUodGVzdEZpbGUsIHRlc3RTYW1wbGUsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgbmV3IFNlbGVjdG9yKHNyYykucHJpbnRBbGwoKTtcbiAgICBjb25zdCByZXMgPSByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjLCAnQGFuZ3VsYXIvY29yZScsICdDb21wb25lbnQnKTtcbiAgICBleHBlY3QocmVzKS50b0JlKCduZy5Db21wb25lbnQnKTtcbiAgfSk7XG59KTtcblxuIl19
