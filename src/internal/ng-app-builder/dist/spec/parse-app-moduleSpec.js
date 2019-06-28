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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3BhcnNlLWFwcC1tb2R1bGVTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUErQztBQUMvQyxzRkFBcUY7QUFDckYsMkJBQWdDO0FBQ2hDLCtCQUE2QjtBQUU3QixNQUFNLGNBQWUsU0FBUSwwQkFBZTtJQUMxQyxtQkFBbUIsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRjtBQUVELFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxNQUFzQixDQUFDO0lBQzNCLElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUksT0FBZSxDQUFDO0lBRXBCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixNQUFNLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUM5QixNQUFNLEdBQUcsaUJBQVksQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQ2hEO1lBQ0UsNEJBQTRCO1lBQzVCLHFDQUFxQztZQUNyQyxvREFBb0Q7U0FDckQsRUFBRTtZQUNELGlCQUFpQjtZQUNqQixrQkFBa0I7WUFDbEIsWUFBWTtTQUNiLENBQUMsQ0FBQztRQUNMLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDNUUsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO1FBQzFCLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQywyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNkO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQix5QkFBeUI7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQy9FLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDM0QsTUFBTSxDQUFDLDRDQUF5QixDQUFDLGNBQU8sQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO2FBQ3RGLElBQUksQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvcGFyc2UtYXBwLW1vZHVsZVNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggbm8tY29uc29sZSAqL1xuaW1wb3J0IEFwcE1vZHVsZVBhcnNlciwge2ZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW59IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5cbmNsYXNzIFRlc3RhYmxlUGFyc2VyIGV4dGVuZHMgQXBwTW9kdWxlUGFyc2VyIHtcbiAgX2ZpbmRFc0ltcG9ydEJ5TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gc3VwZXIuZmluZEVzSW1wb3J0QnlOYW1lKG5hbWUpO1xuICB9XG59XG5cbmRlc2NyaWJlKCdwYXJzZS1hcHAtbW9kdWxlJywgKCkgPT4ge1xuICBsZXQgcGFyc2VyOiBUZXN0YWJsZVBhcnNlcjtcbiAgbGV0IHNvdXJjZTogc3RyaW5nO1xuICBsZXQgcGF0Y2hlZDogc3RyaW5nO1xuXG4gIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgcGFyc2VyID0gbmV3IFRlc3RhYmxlUGFyc2VyKCk7XG4gICAgc291cmNlID0gcmVhZEZpbGVTeW5jKHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpLCAndXRmOCcpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNhbiBmaW5kIG91dCBOZ01vZHVsZScsICgpID0+IHtcbiAgICBleHBlY3Qoc291cmNlLmluZGV4T2YoJ2Zyb20gXFwnQGJrL21vZHVsZS11c2VyXFwnJykpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBleHBlY3Qoc291cmNlLmluZGV4T2YoJ2Zyb20gXFwnQGJrL21vZHVsZS1yZWFsLW5hbWVcXCcnKSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIGV4cGVjdChzb3VyY2UuaW5kZXhPZignZnJvbSBcXCdAYmsvbW9kdWxlLWFwcGx5L2FwcGx5LWxhenkubW9kdWxlXFwnJykpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBwYXRjaGVkID0gcGFyc2VyLnBhdGNoRmlsZSgnYXBwLm1vZHVsZS50cycsIHNvdXJjZSxcbiAgICAgIFtcbiAgICAgICAgJ0Biay9tb2R1bGUtdXNlciNVc2VyTW9kdWxlJyxcbiAgICAgICAgJ0Biay9tb2R1bGUtcmVhbC1uYW1lI1JlYWxOYW1lTW9kdWxlJyxcbiAgICAgICAgJ0Biay9tb2R1bGUtYXBwbHkvYXBwbHktbGF6eS5tb2R1bGUjQXBwbHlMYXp5TW9kdWxlJ1xuICAgICAgXSwgW1xuICAgICAgICAnQGJrL2Zvb2JhciNtaWxrJyxcbiAgICAgICAgJ0Biay9mb29iYXIjd2F0ZXInLFxuICAgICAgICAnZm9vYmFyI3RlYSdcbiAgICAgIF0pO1xuICAgIGV4cGVjdChwYXJzZXIuX2ZpbmRFc0ltcG9ydEJ5TmFtZSgnXy5nZXQnKSEuZnJvbSkudG9CZSgnbG9kYXNoJyk7XG4gICAgZXhwZWN0KHBhcnNlci5fZmluZEVzSW1wb3J0QnlOYW1lKCdlbnYnKSEuZnJvbSkudG9CZSgnQGJrL2Vudi9lbnZpcm9ubWVudCcpO1xuICAgIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBrIG9mIHBhcnNlci5lc0ltcG9ydHNNYXAua2V5cygpKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhwYXJzZXIuZXNJbXBvcnRzTWFwLmdldChrKSk7XG4gICAgICBrZXlzLnB1c2goayk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHBhdGNoZWQpO1xuICAgIC8vIGV4cGVjdChrZXlzKS50b0JlKFtdKTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCByZW1vdmUgZHluYW1pYyBtb2R1bGVzJywgKCkgPT4ge1xuICAgIGV4cGVjdChwYXRjaGVkKS5ub3QudG9Db250YWluKCdmcm9tIFxcJ0Biay9tb2R1bGUtdXNlclxcJycpO1xuICAgIGV4cGVjdChwYXRjaGVkKS5ub3QudG9Db250YWluKCdmcm9tIFxcJ0Biay9tb2R1bGUtcmVhbC1uYW1lXFwnJyk7XG4gICAgZXhwZWN0KHBhdGNoZWQpLm5vdC50b0NvbnRhaW4oJ2Zyb20gXFwnQGJrL21vZHVsZS1hcHBseS9hcHBseS1sYXp5Lm1vZHVsZVxcJycpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNhbiBhZGQgbmV3IG1vZHVsZXMnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHBhdGNoZWQpLnRvTWF0Y2goL21pbGtfMCxcXHMqd2F0ZXJfMSxcXHMqdGVhXzIvKTtcbiAgICBleHBlY3QocGF0Y2hlZCkudG9Db250YWluKCdpbXBvcnQge21pbGsgYXMgbWlsa18wLCB3YXRlciBhcyB3YXRlcl8xfSBmcm9tIFxcJ0Biay9mb29iYXJcXCc7Jyk7XG4gICAgZXhwZWN0KHBhdGNoZWQpLnRvQ29udGFpbignaW1wb3J0IHt0ZWEgYXMgdGVhXzJ9IGZyb20gXFwnZm9vYmFyXFwnOycpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNhbiBsb2NhdGUgYXBwLm1vZHVsZS50cyBmaWxlIGZyb20gbWFpbi50cycsICgpID0+IHtcbiAgICBleHBlY3QoZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvbWFpbi10ZXN0LnRzLnR4dCcpKSlcbiAgICAudG9CZShyZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwL2FwcC5tb2R1bGUudHMnKSk7XG4gIH0pO1xufSk7XG4iXX0=
