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
/* tslint:disable max-line-length no-console */
const parse_app_module_1 = __importStar(require("../utils/parse-app-module"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3BhcnNlLWFwcC1tb2R1bGVTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUErQztBQUMvQyw4RUFBcUY7QUFDckYsMkJBQWdDO0FBQ2hDLCtCQUE2QjtBQUU3QixNQUFNLGNBQWUsU0FBUSwwQkFBZTtJQUMxQyxtQkFBbUIsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRjtBQUVELFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDakMsSUFBSSxNQUFzQixDQUFDO0lBQzNCLElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUksT0FBZSxDQUFDO0lBRXBCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixNQUFNLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUM5QixNQUFNLEdBQUcsaUJBQVksQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQ2hEO1lBQ0UsNEJBQTRCO1lBQzVCLHFDQUFxQztZQUNyQyxvREFBb0Q7U0FDckQsRUFBRTtZQUNELGlCQUFpQjtZQUNqQixrQkFBa0I7WUFDbEIsWUFBWTtTQUNiLENBQUMsQ0FBQztRQUNMLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDNUUsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO1FBQzFCLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQywyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNkO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQix5QkFBeUI7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQy9FLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDM0QsTUFBTSxDQUFDLDRDQUF5QixDQUFDLGNBQU8sQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO2FBQ3RGLElBQUksQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3Qvc3BlYy9wYXJzZS1hcHAtbW9kdWxlU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
