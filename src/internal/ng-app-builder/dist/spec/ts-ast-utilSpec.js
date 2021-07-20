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
/* eslint-disable no-console */
const fs = __importStar(require("fs"));
const path_1 = require("path");
// const log = require('log4js').getLogger('ts-ast-querySpec');
const ts_ast_util_1 = require("../utils/ts-ast-util");
const ts = __importStar(require("typescript"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXV0aWxTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHMtYXN0LXV0aWxTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQix1Q0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtEQUErRDtBQUUvRCxzREFBaUY7QUFDakYsK0NBQWlDO0FBQ2pDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzNCLElBQUksV0FBbUIsQ0FBQztJQUN4QixNQUFNLFFBQVEsR0FBRyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7SUFFdkUsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDckMsTUFBTSxDQUFDLGtDQUFvQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1FBQ25ILE1BQU0sQ0FBQyxrQ0FBb0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQzthQUNoRSxJQUFJLENBQUMsY0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFDM0UsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsTUFBTSxHQUFHLEdBQUcsbUNBQXFCLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHFEQUFxRCxFQUFFLEdBQUcsRUFBRTtRQUM3RCxNQUFNLFVBQVUsR0FBRzs7O0dBR3BCLENBQUM7UUFDQSxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFDMUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsZ0NBQWdDO1FBQ2hDLE1BQU0sR0FBRyxHQUFHLG1DQUFxQixDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICdwYXRoJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigndHMtYXN0LXF1ZXJ5U3BlYycpO1xuXG5pbXBvcnQge3Jlc29sdmVJbXBvcnRCaW5kTmFtZSwgZGVmYXVsdFJlc29sdmVNb2R1bGV9IGZyb20gJy4uL3V0aWxzL3RzLWFzdC11dGlsJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuZGVzY3JpYmUoJ3RzLWFzdC11dGlsJywgKCkgPT4ge1xuICBsZXQgdGVzdENvbnRlbnQ6IHN0cmluZztcbiAgY29uc3QgdGVzdEZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcblxuICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgIHRlc3RDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHRlc3RGaWxlLCAndXRmOCcpO1xuICB9KTtcblxuICBpdCgncmVzb2x2ZU1vZHVsZSgpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGV4cGVjdChkZWZhdWx0UmVzb2x2ZU1vZHVsZSgnLi9hYmMnLCBfX2ZpbGVuYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJykpLnRvQmUoX19kaXJuYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvYWJjJyk7XG4gICAgZXhwZWN0KGRlZmF1bHRSZXNvbHZlTW9kdWxlKCdhYmMnLCBfX2ZpbGVuYW1lKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgICAudG9CZShyZXNvbHZlKCdub2RlX21vZHVsZXMvYWJjJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgfSk7XG5cbiAgaXQoJ3Jlc29sdmVJbXBvcnRCaW5kTmFtZScsICgpID0+IHtcbiAgICBjb25zdCBzcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHRlc3RGaWxlLCB0ZXN0Q29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICBjb25zdCByZXMgPSByZXNvbHZlSW1wb3J0QmluZE5hbWUoc3JjLCAnQGFuZ3VsYXIvY29yZScsICdJbmplY3RhYmxlJyk7XG4gICAgZXhwZWN0KHJlcykudG9CZSgnSW5qZWN0YWJsZScpO1xuICB9KTtcblxuICBpdCgncmVzb2x2ZUltcG9ydEJpbmROYW1lIGZvciBpbXBvcnQgbmFtZSBzcGFjZSBiaW5kaW5nJywgKCkgPT4ge1xuICAgIGNvbnN0IHRlc3RTYW1wbGUgPSAnaW1wb3J0ICogYXMgbmcgZnJvbSBcIkBhbmd1bGFyL2NvcmVcIjtcXFxuXHRcdFx0QG5nLkNvbXBvbmVudCh7fSlcXFxuXHRcdFx0Y2xhc3MgTXlDb21wb25lbnQge31cXFxuXHRcdCc7XG4gICAgY29uc3Qgc3JjID0gdHMuY3JlYXRlU291cmNlRmlsZSh0ZXN0RmlsZSwgdGVzdFNhbXBsZSwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICAvLyBuZXcgU2VsZWN0b3Ioc3JjKS5wcmludEFsbCgpO1xuICAgIGNvbnN0IHJlcyA9IHJlc29sdmVJbXBvcnRCaW5kTmFtZShzcmMsICdAYW5ndWxhci9jb3JlJywgJ0NvbXBvbmVudCcpO1xuICAgIGV4cGVjdChyZXMpLnRvQmUoJ25nLkNvbXBvbmVudCcpO1xuICB9KTtcbn0pO1xuXG4iXX0=