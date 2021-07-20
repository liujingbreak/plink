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
/* eslint-disable  no-console */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWFvdFNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcGktYW90U3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnQ0FBZ0M7QUFDaEMsMkVBQW9EO0FBQ3BELHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsaUNBQWtDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDNUMsa0RBQXdCO0FBRXhCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBRyxDQUFDLEVBQUU7WUFDeEMsV0FBVyxFQUFFLEVBQUMsVUFBVSxFQUFFLEVBQUUsRUFBQztZQUM3QixpQkFBaUIsQ0FBQyxJQUFZO2dCQUM1QixPQUFPLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDO1lBQzVCLENBQUM7WUFDRCxvQkFBb0IsQ0FBQyxFQUFzQjtnQkFDekMsT0FBTztvQkFDTCxXQUFXLEVBQUUsY0FBYztvQkFDM0IsTUFBTSxFQUFFLEdBQUcsRUFBRTt3QkFDWCxPQUFPLEVBQUMsWUFBWSxFQUFFLFFBQVEsRUFBQyxDQUFDO29CQUNsQyxDQUFDO29CQUNELFNBQVM7d0JBQ1AsT0FBTyxRQUFRLENBQUM7b0JBQ2xCLENBQUM7b0JBQ0QsVUFBVSxFQUFFLGFBQWE7aUJBQzFCLENBQUM7WUFDSixDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSx1QkFBYyxDQUFDLFNBQVMsRUFDM0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxxQ0FBcUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDM0YsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEIsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUMxRCxnQkFBZ0I7WUFDaEIsVUFBVTtZQUNWLFVBQVU7WUFDVixVQUFVO1lBQ1YsZUFBZTtTQUNoQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuLi91dGlscy90cy1iZWZvcmUtYW90JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbG9nNGpzID0gcmVxdWlyZSgnbG9nNGpzJyk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdhcGktYW90U3BlYycpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5cbmRlc2NyaWJlKCdhcGlBb3RDb21waWxlcicsICgpID0+IHtcbiAgaXQoJ3Nob3VsZCByZWNvZ2FuaXplIGlkZW50aWZpZXIgX19hcGknLCAoKSA9PiB7XG4gICAgT2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuICAgICAgcGFja2FnZUluZm86IHthbGxNb2R1bGVzOiBbXX0sXG4gICAgICBmaW5kUGFja2FnZUJ5RmlsZShmaWxlOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHtsb25nTmFtZTogJ3Rlc3QnfTtcbiAgICAgIH0sXG4gICAgICBnZXROb2RlQXBpRm9yUGFja2FnZShwazoge2xvbmdOYW1lOiBzdHJpbmd9KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGFja2FnZU5hbWU6ICdQQUNLQUdFX05BTUUnLFxuICAgICAgICAgIGNvbmZpZzogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtQQUNLQUdFX05BTUU6ICdDT05GSUcnfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFzc2V0c1VybCgpIHtcbiAgICAgICAgICAgIHJldHVybiAnQVNTRVRTJztcbiAgICAgICAgICB9LFxuICAgICAgICAgIHB1YmxpY1BhdGg6ICdQVUJMSUNfUEFUSCdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb25zdCBjb21waWxlciA9IG5ldyBBcGlBb3RDb21waWxlcigndGVzdC50cycsXG4gICAgICBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBpLWFvdC1zYW1wbGUudHMudHh0JyksICd1dGY4JykpO1xuICAgIGxvZy5pbmZvKGNvbXBpbGVyLnBhcnNlKHNvdXJjZSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhzb3VyY2UpO1xuICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9KSk7XG4gICAgbG9nLmluZm8oY29tcGlsZXIucmVwbGFjZW1lbnRzLm1hcCgoe3RleHR9KSA9PiB0ZXh0KS5qb2luKCdcXG4nKSk7XG4gICAgZXhwZWN0KGNvbXBpbGVyLnJlcGxhY2VtZW50cy5tYXAoKHt0ZXh0fSkgPT4gdGV4dCkpLnRvRXF1YWwoW1xuICAgICAgJ1wiUEFDS0FHRV9OQU1FXCInLFxuICAgICAgJ1wiQVNTRVRTXCInLFxuICAgICAgJ1wiQVNTRVRTXCInLFxuICAgICAgJ1wiQ09ORklHXCInLFxuICAgICAgJ1wiUFVCTElDX1BBVEhcIidcbiAgICBdKTtcbiAgfSk7XG59KTtcbiJdfQ==