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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const ts_before_aot_1 = __importDefault(require("../utils/ts-before-aot"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const log4js = require("log4js");
const log = log4js.getLogger('api-aotSpec');
const __api_1 = __importDefault(require("__api"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWFvdFNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcGktYW90U3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsMkVBQW9EO0FBQ3BELHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsaUNBQWtDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDNUMsa0RBQXdCO0FBRXhCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBRyxDQUFDLEVBQUU7WUFDeEMsV0FBVyxFQUFFLEVBQUMsVUFBVSxFQUFFLEVBQUUsRUFBQztZQUM3QixpQkFBaUIsQ0FBQyxJQUFZO2dCQUM1QixPQUFPLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDO1lBQzVCLENBQUM7WUFDRCxvQkFBb0IsQ0FBQyxFQUFzQjtnQkFDekMsT0FBTztvQkFDTCxXQUFXLEVBQUUsY0FBYztvQkFDM0IsTUFBTSxFQUFFLEdBQUcsRUFBRTt3QkFDWCxPQUFPLEVBQUMsWUFBWSxFQUFFLFFBQVEsRUFBQyxDQUFDO29CQUNsQyxDQUFDO29CQUNELFNBQVM7d0JBQ1AsT0FBTyxRQUFRLENBQUM7b0JBQ2xCLENBQUM7b0JBQ0QsVUFBVSxFQUFFLGFBQWE7aUJBQzFCLENBQUM7WUFDSixDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSx1QkFBYyxDQUFDLFNBQVMsRUFDM0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxxQ0FBcUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDM0YsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEIsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUMxRCxnQkFBZ0I7WUFDaEIsVUFBVTtZQUNWLFVBQVU7WUFDVixVQUFVO1lBQ1YsZUFBZTtTQUNoQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IEFwaUFvdENvbXBpbGVyIGZyb20gJy4uL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2FwaS1hb3RTcGVjJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxuZGVzY3JpYmUoJ2FwaUFvdENvbXBpbGVyJywgKCkgPT4ge1xuICBpdCgnc2hvdWxkIHJlY29nYW5pemUgaWRlbnRpZmllciBfX2FwaScsICgpID0+IHtcbiAgICBPYmplY3QuYXNzaWduKE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpLCB7XG4gICAgICBwYWNrYWdlSW5mbzoge2FsbE1vZHVsZXM6IFtdfSxcbiAgICAgIGZpbmRQYWNrYWdlQnlGaWxlKGZpbGU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4ge2xvbmdOYW1lOiAndGVzdCd9O1xuICAgICAgfSxcbiAgICAgIGdldE5vZGVBcGlGb3JQYWNrYWdlKHBrOiB7bG9uZ05hbWU6IHN0cmluZ30pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBwYWNrYWdlTmFtZTogJ1BBQ0tBR0VfTkFNRScsXG4gICAgICAgICAgY29uZmlnOiAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1BBQ0tBR0VfTkFNRTogJ0NPTkZJRyd9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYXNzZXRzVXJsKCkge1xuICAgICAgICAgICAgcmV0dXJuICdBU1NFVFMnO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcHVibGljUGF0aDogJ1BVQkxJQ19QQVRIJ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbnN0IGNvbXBpbGVyID0gbmV3IEFwaUFvdENvbXBpbGVyKCd0ZXN0LnRzJyxcbiAgICAgIGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcGktYW90LXNhbXBsZS50cy50eHQnKSwgJ3V0ZjgnKSk7XG4gICAgbG9nLmluZm8oY29tcGlsZXIucGFyc2Uoc291cmNlID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKHNvdXJjZSk7XG4gICAgICByZXR1cm4gc291cmNlO1xuICAgIH0pKTtcbiAgICBsb2cuaW5mbyhjb21waWxlci5yZXBsYWNlbWVudHMubWFwKCh7dGV4dH0pID0+IHRleHQpLmpvaW4oJ1xcbicpKTtcbiAgICBleHBlY3QoY29tcGlsZXIucmVwbGFjZW1lbnRzLm1hcCgoe3RleHR9KSA9PiB0ZXh0KSkudG9FcXVhbChbXG4gICAgICAnXCJQQUNLQUdFX05BTUVcIicsXG4gICAgICAnXCJBU1NFVFNcIicsXG4gICAgICAnXCJBU1NFVFNcIicsXG4gICAgICAnXCJDT05GSUdcIicsXG4gICAgICAnXCJQVUJMSUNfUEFUSFwiJ1xuICAgIF0pO1xuICB9KTtcbn0pO1xuIl19