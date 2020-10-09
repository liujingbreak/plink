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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2FwaS1hb3RTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwyRUFBb0Q7QUFDcEQsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixpQ0FBa0M7QUFDbEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QyxrREFBd0I7QUFFeEIsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM5QixFQUFFLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFHLENBQUMsRUFBRTtZQUN4QyxXQUFXLEVBQUUsRUFBQyxVQUFVLEVBQUUsRUFBRSxFQUFDO1lBQzdCLGlCQUFpQixDQUFDLElBQVk7Z0JBQzVCLE9BQU8sRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUM7WUFDNUIsQ0FBQztZQUNELG9CQUFvQixDQUFDLEVBQXNCO2dCQUN6QyxPQUFPO29CQUNMLFdBQVcsRUFBRSxjQUFjO29CQUMzQixNQUFNLEVBQUUsR0FBRyxFQUFFO3dCQUNYLE9BQU8sRUFBQyxZQUFZLEVBQUUsUUFBUSxFQUFDLENBQUM7b0JBQ2xDLENBQUM7b0JBQ0QsU0FBUzt3QkFDUCxPQUFPLFFBQVEsQ0FBQztvQkFDbEIsQ0FBQztvQkFDRCxVQUFVLEVBQUUsYUFBYTtpQkFDMUIsQ0FBQztZQUNKLENBQUM7U0FDRixDQUFDLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUFjLENBQUMsU0FBUyxFQUMzQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHFDQUFxQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMzRixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQixPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzFELGdCQUFnQjtZQUNoQixVQUFVO1lBQ1YsVUFBVTtZQUNWLFVBQVU7WUFDVixlQUFlO1NBQ2hCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC9zcGVjL2FwaS1hb3RTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
