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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2FwaS1hb3RTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUErQjtBQUMvQixtRkFBb0Q7QUFDcEQsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUM3QixpQ0FBa0M7QUFDbEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QywwREFBd0I7QUFFeEIsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUMvQixFQUFFLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQzdDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFHLENBQUMsRUFBRTtZQUN6QyxXQUFXLEVBQUUsRUFBQyxVQUFVLEVBQUUsRUFBRSxFQUFDO1lBQzdCLGlCQUFpQixDQUFDLElBQVk7Z0JBQzdCLE9BQU8sRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUM7WUFDM0IsQ0FBQztZQUNELG9CQUFvQixDQUFDLEVBQXNCO2dCQUMxQyxPQUFPO29CQUNOLFdBQVcsRUFBRSxjQUFjO29CQUMzQixNQUFNLEVBQUUsR0FBRyxFQUFFO3dCQUNaLE9BQU8sRUFBQyxZQUFZLEVBQUUsUUFBUSxFQUFDLENBQUM7b0JBQ2pDLENBQUM7b0JBQ0QsU0FBUzt3QkFDUixPQUFPLFFBQVEsQ0FBQztvQkFDakIsQ0FBQztvQkFDRCxVQUFVLEVBQUUsYUFBYTtpQkFDekIsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUFjLENBQUMsU0FBUyxFQUM1QyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHFDQUFxQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMxRixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDM0QsZ0JBQWdCO1lBQ2hCLFVBQVU7WUFDVixVQUFVO1lBQ1YsVUFBVTtZQUNWLGVBQWU7U0FDZixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvYXBpLWFvdFNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgQXBpQW90Q29tcGlsZXIgZnJvbSAnLi4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYXBpLWFvdFNwZWMnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuXG5kZXNjcmliZSgnYXBpQW90Q29tcGlsZXInLCAoKSA9PiB7XG5cdGl0KCdzaG91bGQgcmVjb2dhbml6ZSBpZGVudGlmaWVyIF9fYXBpJywgKCkgPT4ge1xuXHRcdE9iamVjdC5hc3NpZ24oT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSksIHtcblx0XHRcdHBhY2thZ2VJbmZvOiB7YWxsTW9kdWxlczogW119LFxuXHRcdFx0ZmluZFBhY2thZ2VCeUZpbGUoZmlsZTogc3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiB7bG9uZ05hbWU6ICd0ZXN0J307XG5cdFx0XHR9LFxuXHRcdFx0Z2V0Tm9kZUFwaUZvclBhY2thZ2UocGs6IHtsb25nTmFtZTogc3RyaW5nfSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHBhY2thZ2VOYW1lOiAnUEFDS0FHRV9OQU1FJyxcblx0XHRcdFx0XHRjb25maWc6ICgpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB7UEFDS0FHRV9OQU1FOiAnQ09ORklHJ307XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRhc3NldHNVcmwoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ0FTU0VUUyc7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRwdWJsaWNQYXRoOiAnUFVCTElDX1BBVEgnXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc3QgY29tcGlsZXIgPSBuZXcgQXBpQW90Q29tcGlsZXIoJ3Rlc3QudHMnLFxuXHRcdFx0ZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwaS1hb3Qtc2FtcGxlLnRzLnR4dCcpLCAndXRmOCcpKTtcblx0XHRsb2cuaW5mbyhjb21waWxlci5wYXJzZShzb3VyY2UgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coc291cmNlKTtcblx0XHRcdHJldHVybiBzb3VyY2U7XG5cdFx0fSkpO1xuXHRcdGxvZy5pbmZvKGNvbXBpbGVyLnJlcGxhY2VtZW50cy5tYXAoKHt0ZXh0fSkgPT4gdGV4dCkuam9pbignXFxuJykpO1xuXHRcdGV4cGVjdChjb21waWxlci5yZXBsYWNlbWVudHMubWFwKCh7dGV4dH0pID0+IHRleHQpKS50b0VxdWFsKFtcblx0XHRcdCdcIlBBQ0tBR0VfTkFNRVwiJyxcblx0XHRcdCdcIkFTU0VUU1wiJyxcblx0XHRcdCdcIkFTU0VUU1wiJyxcblx0XHRcdCdcIkNPTkZJR1wiJyxcblx0XHRcdCdcIlBVQkxJQ19QQVRIXCInXG5cdFx0XSk7XG5cdH0pO1xufSk7XG4iXX0=
