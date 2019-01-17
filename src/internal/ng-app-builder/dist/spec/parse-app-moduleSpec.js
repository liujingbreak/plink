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
describe('parse-app-module', () => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3BhcnNlLWFwcC1tb2R1bGVTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUErQztBQUMvQyxzRkFBcUY7QUFDckYsMkJBQWdDO0FBQ2hDLCtCQUE2QjtBQUU3QixNQUFNLGNBQWUsU0FBUSwwQkFBZTtJQUMzQyxtQkFBbUIsQ0FBQyxJQUFZO1FBQy9CLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRDtBQUVELFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDakMsSUFBSSxNQUFzQixDQUFDO0lBQzNCLElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUksT0FBZSxDQUFDO0lBRXBCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDZCxNQUFNLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUM5QixNQUFNLEdBQUcsaUJBQVksQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQ2pEO1lBQ0MsNEJBQTRCO1lBQzVCLHFDQUFxQztZQUNyQyxvREFBb0Q7U0FDcEQsRUFBRTtZQUNGLGlCQUFpQjtZQUNqQixrQkFBa0I7WUFDbEIsWUFBWTtTQUNaLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDM0UsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO1FBQzFCLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMzQywyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNiO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQix5QkFBeUI7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQzlFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDNUQsTUFBTSxDQUFDLDRDQUF5QixDQUFDLGNBQU8sQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO2FBQ3RGLElBQUksQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvcGFyc2UtYXBwLW1vZHVsZVNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggbm8tY29uc29sZSAqL1xuaW1wb3J0IEFwcE1vZHVsZVBhcnNlciwge2ZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW59IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5cbmNsYXNzIFRlc3RhYmxlUGFyc2VyIGV4dGVuZHMgQXBwTW9kdWxlUGFyc2VyIHtcblx0X2ZpbmRFc0ltcG9ydEJ5TmFtZShuYW1lOiBzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3VwZXIuZmluZEVzSW1wb3J0QnlOYW1lKG5hbWUpO1xuXHR9XG59XG5cbmRlc2NyaWJlKCdwYXJzZS1hcHAtbW9kdWxlJywgKCkgPT4ge1xuXHRsZXQgcGFyc2VyOiBUZXN0YWJsZVBhcnNlcjtcblx0bGV0IHNvdXJjZTogc3RyaW5nO1xuXHRsZXQgcGF0Y2hlZDogc3RyaW5nO1xuXG5cdGJlZm9yZUFsbCgoKSA9PiB7XG5cdFx0cGFyc2VyID0gbmV3IFRlc3RhYmxlUGFyc2VyKCk7XG5cdFx0c291cmNlID0gcmVhZEZpbGVTeW5jKHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpLCAndXRmOCcpO1xuXHR9KTtcblxuXHRpdCgnc2hvdWxkIGNhbiBmaW5kIG91dCBOZ01vZHVsZScsICgpID0+IHtcblx0XHRleHBlY3Qoc291cmNlLmluZGV4T2YoJ2Zyb20gXFwnQGJrL21vZHVsZS11c2VyXFwnJykpLnRvQmVHcmVhdGVyVGhhbigwKTtcblx0XHRleHBlY3Qoc291cmNlLmluZGV4T2YoJ2Zyb20gXFwnQGJrL21vZHVsZS1yZWFsLW5hbWVcXCcnKSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuXHRcdGV4cGVjdChzb3VyY2UuaW5kZXhPZignZnJvbSBcXCdAYmsvbW9kdWxlLWFwcGx5L2FwcGx5LWxhenkubW9kdWxlXFwnJykpLnRvQmVHcmVhdGVyVGhhbigwKTtcblx0XHRwYXRjaGVkID0gcGFyc2VyLnBhdGNoRmlsZSgnYXBwLm1vZHVsZS50cycsIHNvdXJjZSxcblx0XHRcdFtcblx0XHRcdFx0J0Biay9tb2R1bGUtdXNlciNVc2VyTW9kdWxlJyxcblx0XHRcdFx0J0Biay9tb2R1bGUtcmVhbC1uYW1lI1JlYWxOYW1lTW9kdWxlJyxcblx0XHRcdFx0J0Biay9tb2R1bGUtYXBwbHkvYXBwbHktbGF6eS5tb2R1bGUjQXBwbHlMYXp5TW9kdWxlJ1xuXHRcdFx0XSwgW1xuXHRcdFx0XHQnQGJrL2Zvb2JhciNtaWxrJyxcblx0XHRcdFx0J0Biay9mb29iYXIjd2F0ZXInLFxuXHRcdFx0XHQnZm9vYmFyI3RlYSdcblx0XHRcdF0pO1xuXHRcdGV4cGVjdChwYXJzZXIuX2ZpbmRFc0ltcG9ydEJ5TmFtZSgnXy5nZXQnKS5mcm9tKS50b0JlKCdsb2Rhc2gnKTtcblx0XHRleHBlY3QocGFyc2VyLl9maW5kRXNJbXBvcnRCeU5hbWUoJ2VudicpLmZyb20pLnRvQmUoJ0Biay9lbnYvZW52aXJvbm1lbnQnKTtcblx0XHRjb25zdCBrZXlzOiBzdHJpbmdbXSA9IFtdO1xuXHRcdGZvciAoY29uc3QgayBvZiBwYXJzZXIuZXNJbXBvcnRzTWFwLmtleXMoKSkge1xuXHRcdFx0Ly8gY29uc29sZS5sb2cocGFyc2VyLmVzSW1wb3J0c01hcC5nZXQoaykpO1xuXHRcdFx0a2V5cy5wdXNoKGspO1xuXHRcdH1cblx0XHRjb25zb2xlLmxvZyhwYXRjaGVkKTtcblx0XHQvLyBleHBlY3Qoa2V5cykudG9CZShbXSk7XG5cdH0pO1xuXG5cdGl0KCdzaG91bGQgcmVtb3ZlIGR5bmFtaWMgbW9kdWxlcycsICgpID0+IHtcblx0XHRleHBlY3QocGF0Y2hlZCkubm90LnRvQ29udGFpbignZnJvbSBcXCdAYmsvbW9kdWxlLXVzZXJcXCcnKTtcblx0XHRleHBlY3QocGF0Y2hlZCkubm90LnRvQ29udGFpbignZnJvbSBcXCdAYmsvbW9kdWxlLXJlYWwtbmFtZVxcJycpO1xuXHRcdGV4cGVjdChwYXRjaGVkKS5ub3QudG9Db250YWluKCdmcm9tIFxcJ0Biay9tb2R1bGUtYXBwbHkvYXBwbHktbGF6eS5tb2R1bGVcXCcnKTtcblx0fSk7XG5cblx0aXQoJ3Nob3VsZCBjYW4gYWRkIG5ldyBtb2R1bGVzJywgKCkgPT4ge1xuXHRcdGV4cGVjdChwYXRjaGVkKS50b01hdGNoKC9taWxrXzAsXFxzKndhdGVyXzEsXFxzKnRlYV8yLyk7XG5cdFx0ZXhwZWN0KHBhdGNoZWQpLnRvQ29udGFpbignaW1wb3J0IHttaWxrIGFzIG1pbGtfMCwgd2F0ZXIgYXMgd2F0ZXJfMX0gZnJvbSBcXCdAYmsvZm9vYmFyXFwnOycpO1xuXHRcdGV4cGVjdChwYXRjaGVkKS50b0NvbnRhaW4oJ2ltcG9ydCB7dGVhIGFzIHRlYV8yfSBmcm9tIFxcJ2Zvb2JhclxcJzsnKTtcblx0fSk7XG5cblx0aXQoJ3Nob3VsZCBjYW4gbG9jYXRlIGFwcC5tb2R1bGUudHMgZmlsZSBmcm9tIG1haW4udHMnLCAoKSA9PiB7XG5cdFx0ZXhwZWN0KGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4ocmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL21haW4tdGVzdC50cy50eHQnKSkpXG5cdFx0LnRvQmUocmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC9hcHAubW9kdWxlLnRzJykpO1xuXHR9KTtcbn0pO1xuIl19
