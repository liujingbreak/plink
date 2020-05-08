"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const fs = tslib_1.__importStar(require("fs"));
const path_1 = require("path");
// const log = require('log4js').getLogger('ts-ast-querySpec');
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
        // new Selector(src).printAll();
        const res = ts_ast_util_1.resolveImportBindName(src, '@angular/core', 'Component');
        expect(res).toBe('ng.Component');
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC11dGlsU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsK0NBQXlCO0FBQ3pCLCtCQUE2QjtBQUM3QiwrREFBK0Q7QUFFL0Qsc0RBQWlGO0FBQ2pGLHVEQUFpQztBQUNqQyxRQUFRLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUMzQixJQUFJLFdBQW1CLENBQUM7SUFDeEIsTUFBTSxRQUFRLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO0lBRXZFLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxrQ0FBb0IsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNuSCxNQUFNLENBQUMsa0NBQW9CLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDaEUsSUFBSSxDQUFDLGNBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzNFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sR0FBRyxHQUFHLG1DQUFxQixDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxVQUFVLEdBQUc7OztHQUdwQixDQUFDO1FBQ0EsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzFFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLGdDQUFnQztRQUNoQyxNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zcGVjL3RzLWFzdC11dGlsU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3RzLWFzdC1xdWVyeVNwZWMnKTtcblxuaW1wb3J0IHtyZXNvbHZlSW1wb3J0QmluZE5hbWUsIGRlZmF1bHRSZXNvbHZlTW9kdWxlfSBmcm9tICcuLi91dGlscy90cy1hc3QtdXRpbCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmRlc2NyaWJlKCd0cy1hc3QtdXRpbCcsICgpID0+IHtcbiAgbGV0IHRlc3RDb250ZW50OiBzdHJpbmc7XG4gIGNvbnN0IHRlc3RGaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG5cbiAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICB0ZXN0Q29udGVudCA9IGZzLnJlYWRGaWxlU3luYyh0ZXN0RmlsZSwgJ3V0ZjgnKTtcbiAgfSk7XG5cbiAgaXQoJ3Jlc29sdmVNb2R1bGUoKSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBleHBlY3QoZGVmYXVsdFJlc29sdmVNb2R1bGUoJy4vYWJjJywgX19maWxlbmFtZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKS50b0JlKF9fZGlybmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL2FiYycpO1xuICAgIGV4cGVjdChkZWZhdWx0UmVzb2x2ZU1vZHVsZSgnYWJjJywgX19maWxlbmFtZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKVxuICAgICAgLnRvQmUocmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2FiYycpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH0pO1xuXG4gIGl0KCdyZXNvbHZlSW1wb3J0QmluZE5hbWUnLCAoKSA9PiB7XG4gICAgY29uc3Qgc3JjID0gdHMuY3JlYXRlU291cmNlRmlsZSh0ZXN0RmlsZSwgdGVzdENvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgY29uc3QgcmVzID0gcmVzb2x2ZUltcG9ydEJpbmROYW1lKHNyYywgJ0Bhbmd1bGFyL2NvcmUnLCAnSW5qZWN0YWJsZScpO1xuICAgIGV4cGVjdChyZXMpLnRvQmUoJ0luamVjdGFibGUnKTtcbiAgfSk7XG5cbiAgaXQoJ3Jlc29sdmVJbXBvcnRCaW5kTmFtZSBmb3IgaW1wb3J0IG5hbWUgc3BhY2UgYmluZGluZycsICgpID0+IHtcbiAgICBjb25zdCB0ZXN0U2FtcGxlID0gJ2ltcG9ydCAqIGFzIG5nIGZyb20gXCJAYW5ndWxhci9jb3JlXCI7XFxcblx0XHRcdEBuZy5Db21wb25lbnQoe30pXFxcblx0XHRcdGNsYXNzIE15Q29tcG9uZW50IHt9XFxcblx0XHQnO1xuICAgIGNvbnN0IHNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUodGVzdEZpbGUsIHRlc3RTYW1wbGUsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgLy8gbmV3IFNlbGVjdG9yKHNyYykucHJpbnRBbGwoKTtcbiAgICBjb25zdCByZXMgPSByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjLCAnQGFuZ3VsYXIvY29yZScsICdDb21wb25lbnQnKTtcbiAgICBleHBlY3QocmVzKS50b0JlKCduZy5Db21wb25lbnQnKTtcbiAgfSk7XG59KTtcblxuIl19
