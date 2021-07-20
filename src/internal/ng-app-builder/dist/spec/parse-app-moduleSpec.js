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
/* eslint-disable  max-len, no-console */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtYXBwLW1vZHVsZVNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwYXJzZS1hcHAtbW9kdWxlU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5Q0FBeUM7QUFDekMsOEVBQXFGO0FBQ3JGLDJCQUFnQztBQUNoQywrQkFBNkI7QUFFN0IsTUFBTSxjQUFlLFNBQVEsMEJBQWU7SUFDMUMsbUJBQW1CLENBQUMsSUFBWTtRQUM5QixPQUFPLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0Y7QUFFRCxTQUFTLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLElBQUksTUFBc0IsQ0FBQztJQUMzQixJQUFJLE1BQWMsQ0FBQztJQUNuQixJQUFJLE9BQWUsQ0FBQztJQUVwQixTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2IsTUFBTSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDOUIsTUFBTSxHQUFHLGlCQUFZLENBQUMsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZGLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsNkNBQTZDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RixPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUNoRDtZQUNFLDRCQUE0QjtZQUM1QixxQ0FBcUM7WUFDckMsb0RBQW9EO1NBQ3JELEVBQUU7WUFDRCxpQkFBaUI7WUFDakIsa0JBQWtCO1lBQ2xCLFlBQVk7U0FDYixDQUFDLENBQUM7UUFDTCxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztRQUMxQixLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDMUMsMkNBQTJDO1lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDZDtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIseUJBQXlCO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUN2QyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsNkNBQTZDLENBQUMsQ0FBQztJQUMvRSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztRQUM1RixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzNELE1BQU0sQ0FBQyw0Q0FBeUIsQ0FBQyxjQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQzthQUN0RixJQUFJLENBQUMsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBtYXgtbGVuLCBuby1jb25zb2xlICovXG5pbXBvcnQgQXBwTW9kdWxlUGFyc2VyLCB7ZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbn0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICdwYXRoJztcblxuY2xhc3MgVGVzdGFibGVQYXJzZXIgZXh0ZW5kcyBBcHBNb2R1bGVQYXJzZXIge1xuICBfZmluZEVzSW1wb3J0QnlOYW1lKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBzdXBlci5maW5kRXNJbXBvcnRCeU5hbWUobmFtZSk7XG4gIH1cbn1cblxueGRlc2NyaWJlKCdwYXJzZS1hcHAtbW9kdWxlJywgKCkgPT4ge1xuICBsZXQgcGFyc2VyOiBUZXN0YWJsZVBhcnNlcjtcbiAgbGV0IHNvdXJjZTogc3RyaW5nO1xuICBsZXQgcGF0Y2hlZDogc3RyaW5nO1xuXG4gIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgcGFyc2VyID0gbmV3IFRlc3RhYmxlUGFyc2VyKCk7XG4gICAgc291cmNlID0gcmVhZEZpbGVTeW5jKHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpLCAndXRmOCcpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNhbiBmaW5kIG91dCBOZ01vZHVsZScsICgpID0+IHtcbiAgICBleHBlY3Qoc291cmNlLmluZGV4T2YoJ2Zyb20gXFwnQGJrL21vZHVsZS11c2VyXFwnJykpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBleHBlY3Qoc291cmNlLmluZGV4T2YoJ2Zyb20gXFwnQGJrL21vZHVsZS1yZWFsLW5hbWVcXCcnKSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIGV4cGVjdChzb3VyY2UuaW5kZXhPZignZnJvbSBcXCdAYmsvbW9kdWxlLWFwcGx5L2FwcGx5LWxhenkubW9kdWxlXFwnJykpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBwYXRjaGVkID0gcGFyc2VyLnBhdGNoRmlsZSgnYXBwLm1vZHVsZS50cycsIHNvdXJjZSxcbiAgICAgIFtcbiAgICAgICAgJ0Biay9tb2R1bGUtdXNlciNVc2VyTW9kdWxlJyxcbiAgICAgICAgJ0Biay9tb2R1bGUtcmVhbC1uYW1lI1JlYWxOYW1lTW9kdWxlJyxcbiAgICAgICAgJ0Biay9tb2R1bGUtYXBwbHkvYXBwbHktbGF6eS5tb2R1bGUjQXBwbHlMYXp5TW9kdWxlJ1xuICAgICAgXSwgW1xuICAgICAgICAnQGJrL2Zvb2JhciNtaWxrJyxcbiAgICAgICAgJ0Biay9mb29iYXIjd2F0ZXInLFxuICAgICAgICAnZm9vYmFyI3RlYSdcbiAgICAgIF0pO1xuICAgIGV4cGVjdChwYXJzZXIuX2ZpbmRFc0ltcG9ydEJ5TmFtZSgnXy5nZXQnKSEuZnJvbSkudG9CZSgnbG9kYXNoJyk7XG4gICAgZXhwZWN0KHBhcnNlci5fZmluZEVzSW1wb3J0QnlOYW1lKCdlbnYnKSEuZnJvbSkudG9CZSgnQGJrL2Vudi9lbnZpcm9ubWVudCcpO1xuICAgIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBrIG9mIHBhcnNlci5lc0ltcG9ydHNNYXAua2V5cygpKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhwYXJzZXIuZXNJbXBvcnRzTWFwLmdldChrKSk7XG4gICAgICBrZXlzLnB1c2goayk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHBhdGNoZWQpO1xuICAgIC8vIGV4cGVjdChrZXlzKS50b0JlKFtdKTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCByZW1vdmUgZHluYW1pYyBtb2R1bGVzJywgKCkgPT4ge1xuICAgIGV4cGVjdChwYXRjaGVkKS5ub3QudG9Db250YWluKCdmcm9tIFxcJ0Biay9tb2R1bGUtdXNlclxcJycpO1xuICAgIGV4cGVjdChwYXRjaGVkKS5ub3QudG9Db250YWluKCdmcm9tIFxcJ0Biay9tb2R1bGUtcmVhbC1uYW1lXFwnJyk7XG4gICAgZXhwZWN0KHBhdGNoZWQpLm5vdC50b0NvbnRhaW4oJ2Zyb20gXFwnQGJrL21vZHVsZS1hcHBseS9hcHBseS1sYXp5Lm1vZHVsZVxcJycpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNhbiBhZGQgbmV3IG1vZHVsZXMnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHBhdGNoZWQpLnRvTWF0Y2goL21pbGtfMCxcXHMqd2F0ZXJfMSxcXHMqdGVhXzIvKTtcbiAgICBleHBlY3QocGF0Y2hlZCkudG9Db250YWluKCdpbXBvcnQge21pbGsgYXMgbWlsa18wLCB3YXRlciBhcyB3YXRlcl8xfSBmcm9tIFxcJ0Biay9mb29iYXJcXCc7Jyk7XG4gICAgZXhwZWN0KHBhdGNoZWQpLnRvQ29udGFpbignaW1wb3J0IHt0ZWEgYXMgdGVhXzJ9IGZyb20gXFwnZm9vYmFyXFwnOycpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNhbiBsb2NhdGUgYXBwLm1vZHVsZS50cyBmaWxlIGZyb20gbWFpbi50cycsICgpID0+IHtcbiAgICBleHBlY3QoZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvbWFpbi10ZXN0LnRzLnR4dCcpKSlcbiAgICAudG9CZShyZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwL2FwcC5tb2R1bGUudHMnKSk7XG4gIH0pO1xufSk7XG4iXX0=