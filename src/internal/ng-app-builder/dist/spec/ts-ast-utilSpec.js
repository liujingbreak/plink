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

//# sourceMappingURL=ts-ast-utilSpec.js.map
