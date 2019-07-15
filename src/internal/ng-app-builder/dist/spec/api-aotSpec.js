"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const ts_before_aot_1 = tslib_1.__importDefault(require("../utils/ts-before-aot"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const log4js = require("log4js");
const log = log4js.getLogger('api-aotSpec');
const __api_1 = tslib_1.__importDefault(require("__api"));
describe('apiAotCompiler', () => {
    it('should recoganize identifier __api', () => {
        Object.assign(Object.getPrototypeOf(__api_1.default), {
            packageInfo: { allModules: [] },
            findPackageByFile(file) {
                return { longName: 'test' };
            },
            getNodeApiForPackage(pk) {
                return {
                    packageName: 'PACKAGE_NAME',
                    config: () => {
                        return { PACKAGE_NAME: 'CONFIG' };
                    },
                    assetsUrl() {
                        return 'ASSETS';
                    },
                    publicPath: 'PUBLIC_PATH'
                };
            }
        });
        const compiler = new ts_before_aot_1.default('test.ts', fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/api-aot-sample.ts.txt'), 'utf8'));
        log.info(compiler.parse(source => {
            console.log(source);
            return source;
        }));
        log.info(compiler.replacements.map(({ text }) => text).join('\n'));
        expect(compiler.replacements.map(({ text }) => text)).toEqual([
            '"PACKAGE_NAME"',
            '"ASSETS"',
            '"ASSETS"',
            '"CONFIG"',
            '"PUBLIC_PATH"'
        ]);
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2FwaS1hb3RTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUErQjtBQUMvQixtRkFBb0Q7QUFDcEQsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUM3QixpQ0FBa0M7QUFDbEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QywwREFBd0I7QUFFeEIsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM5QixFQUFFLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFHLENBQUMsRUFBRTtZQUN4QyxXQUFXLEVBQUUsRUFBQyxVQUFVLEVBQUUsRUFBRSxFQUFDO1lBQzdCLGlCQUFpQixDQUFDLElBQVk7Z0JBQzVCLE9BQU8sRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUM7WUFDNUIsQ0FBQztZQUNELG9CQUFvQixDQUFDLEVBQXNCO2dCQUN6QyxPQUFPO29CQUNMLFdBQVcsRUFBRSxjQUFjO29CQUMzQixNQUFNLEVBQUUsR0FBRyxFQUFFO3dCQUNYLE9BQU8sRUFBQyxZQUFZLEVBQUUsUUFBUSxFQUFDLENBQUM7b0JBQ2xDLENBQUM7b0JBQ0QsU0FBUzt3QkFDUCxPQUFPLFFBQVEsQ0FBQztvQkFDbEIsQ0FBQztvQkFDRCxVQUFVLEVBQUUsYUFBYTtpQkFDMUIsQ0FBQztZQUNKLENBQUM7U0FDRixDQUFDLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUFjLENBQUMsU0FBUyxFQUMzQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHFDQUFxQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMzRixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQixPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzFELGdCQUFnQjtZQUNoQixVQUFVO1lBQ1YsVUFBVTtZQUNWLFVBQVU7WUFDVixlQUFlO1NBQ2hCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc3BlYy9hcGktYW90U3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuLi91dGlscy90cy1iZWZvcmUtYW90JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbG9nNGpzID0gcmVxdWlyZSgnbG9nNGpzJyk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdhcGktYW90U3BlYycpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5cbmRlc2NyaWJlKCdhcGlBb3RDb21waWxlcicsICgpID0+IHtcbiAgaXQoJ3Nob3VsZCByZWNvZ2FuaXplIGlkZW50aWZpZXIgX19hcGknLCAoKSA9PiB7XG4gICAgT2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuICAgICAgcGFja2FnZUluZm86IHthbGxNb2R1bGVzOiBbXX0sXG4gICAgICBmaW5kUGFja2FnZUJ5RmlsZShmaWxlOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHtsb25nTmFtZTogJ3Rlc3QnfTtcbiAgICAgIH0sXG4gICAgICBnZXROb2RlQXBpRm9yUGFja2FnZShwazoge2xvbmdOYW1lOiBzdHJpbmd9KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGFja2FnZU5hbWU6ICdQQUNLQUdFX05BTUUnLFxuICAgICAgICAgIGNvbmZpZzogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtQQUNLQUdFX05BTUU6ICdDT05GSUcnfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFzc2V0c1VybCgpIHtcbiAgICAgICAgICAgIHJldHVybiAnQVNTRVRTJztcbiAgICAgICAgICB9LFxuICAgICAgICAgIHB1YmxpY1BhdGg6ICdQVUJMSUNfUEFUSCdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb25zdCBjb21waWxlciA9IG5ldyBBcGlBb3RDb21waWxlcigndGVzdC50cycsXG4gICAgICBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBpLWFvdC1zYW1wbGUudHMudHh0JyksICd1dGY4JykpO1xuICAgIGxvZy5pbmZvKGNvbXBpbGVyLnBhcnNlKHNvdXJjZSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhzb3VyY2UpO1xuICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9KSk7XG4gICAgbG9nLmluZm8oY29tcGlsZXIucmVwbGFjZW1lbnRzLm1hcCgoe3RleHR9KSA9PiB0ZXh0KS5qb2luKCdcXG4nKSk7XG4gICAgZXhwZWN0KGNvbXBpbGVyLnJlcGxhY2VtZW50cy5tYXAoKHt0ZXh0fSkgPT4gdGV4dCkpLnRvRXF1YWwoW1xuICAgICAgJ1wiUEFDS0FHRV9OQU1FXCInLFxuICAgICAgJ1wiQVNTRVRTXCInLFxuICAgICAgJ1wiQVNTRVRTXCInLFxuICAgICAgJ1wiQ09ORklHXCInLFxuICAgICAgJ1wiUFVCTElDX1BBVEhcIidcbiAgICBdKTtcbiAgfSk7XG59KTtcbiJdfQ==
