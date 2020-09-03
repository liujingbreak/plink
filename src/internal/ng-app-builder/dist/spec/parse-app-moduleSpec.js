"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length no-console */
const parse_app_module_1 = tslib_1.__importStar(require("../utils/parse-app-module"));
const fs_1 = require("fs");
const path_1 = require("path");
class TestableParser extends parse_app_module_1.default {
    _findEsImportByName(name) {
        return super.findEsImportByName(name);
    }
}
xdescribe('parse-app-module', () => {
    let parser;
    let source;
    let patched;
    beforeAll(() => {
        parser = new TestableParser();
        source = fs_1.readFileSync(path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt'), 'utf8');
    });
    it('should can find out NgModule', () => {
        expect(source.indexOf('from \'@bk/module-user\'')).toBeGreaterThan(0);
        expect(source.indexOf('from \'@bk/module-real-name\'')).toBeGreaterThan(0);
        expect(source.indexOf('from \'@bk/module-apply/apply-lazy.module\'')).toBeGreaterThan(0);
        patched = parser.patchFile('app.module.ts', source, [
            '@bk/module-user#UserModule',
            '@bk/module-real-name#RealNameModule',
            '@bk/module-apply/apply-lazy.module#ApplyLazyModule'
        ], [
            '@bk/foobar#milk',
            '@bk/foobar#water',
            'foobar#tea'
        ]);
        expect(parser._findEsImportByName('_.get').from).toBe('lodash');
        expect(parser._findEsImportByName('env').from).toBe('@bk/env/environment');
        const keys = [];
        for (const k of parser.esImportsMap.keys()) {
            // console.log(parser.esImportsMap.get(k));
            keys.push(k);
        }
        console.log(patched);
        // expect(keys).toBe([]);
    });
    it('should remove dynamic modules', () => {
        expect(patched).not.toContain('from \'@bk/module-user\'');
        expect(patched).not.toContain('from \'@bk/module-real-name\'');
        expect(patched).not.toContain('from \'@bk/module-apply/apply-lazy.module\'');
    });
    it('should can add new modules', () => {
        expect(patched).toMatch(/milk_0,\s*water_1,\s*tea_2/);
        expect(patched).toContain('import {milk as milk_0, water as water_1} from \'@bk/foobar\';');
        expect(patched).toContain('import {tea as tea_2} from \'foobar\';');
    });
    it('should can locate app.module.ts file from main.ts', () => {
        expect(parse_app_module_1.findAppModuleFileFromMain(path_1.resolve(__dirname, '../../ts/spec/main-test.ts.txt')))
            .toBe(path_1.resolve(__dirname, '../../ts/spec/app/app.module.ts'));
    });
});

//# sourceMappingURL=parse-app-moduleSpec.js.map
