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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWFzdC11dGlsU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLCtCQUE2QjtBQUM3QiwrREFBK0Q7QUFFL0Qsc0RBQWlGO0FBQ2pGLCtDQUFpQztBQUNqQyxRQUFRLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUMzQixJQUFJLFdBQW1CLENBQUM7SUFDeEIsTUFBTSxRQUFRLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO0lBRXZFLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxrQ0FBb0IsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNuSCxNQUFNLENBQUMsa0NBQW9CLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDaEUsSUFBSSxDQUFDLGNBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzNFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sR0FBRyxHQUFHLG1DQUFxQixDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxVQUFVLEdBQUc7OztHQUdwQixDQUFDO1FBQ0EsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzFFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLGdDQUFnQztRQUNoQyxNQUFNLEdBQUcsR0FBRyxtQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3NwZWMvdHMtYXN0LXV0aWxTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
