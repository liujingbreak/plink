"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const replace_and_inject_1 = __importDefault(require("../../ts/tsjs/replace-and-inject"));
const require_injector_1 = __importDefault(require("require-injector"));
const path_1 = __importDefault(require("path"));
describe('replace-and-inject', () => {
    it('replace', () => {
        const rj = new require_injector_1.default({ noNode: true });
        const tsconfig = path_1.default.resolve(require.resolve('@wfh/plink/package.json'), '../wfh/tsconfig-base.json');
        // tslint:disable-next-line
        console.log('tsconfig file', tsconfig);
        rj.fromDir(__dirname).alias('lodash', 'NOTHING_BUT_LONG');
        const rs = replace_and_inject_1.default(path_1.default.resolve(__dirname, 'mock.ts'), mockFileContent, rj, tsconfig, {
            __context: {
                foobar() { return 'REPLACED'; }
            }
        });
        // tslint:disable-next-line
        console.log(rs);
    });
});
const mockFileContent = 'import _ from \'lodash\';__context.foobar();';

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL3NwZWMvcmVwbGFjZS1hbmQtaW5qZWN0U3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDBGQUFnRTtBQUNoRSx3RUFBa0M7QUFDbEMsZ0RBQXdCO0FBRXhCLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDakIsTUFBTSxFQUFFLEdBQUcsSUFBSSwwQkFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUN2RywyQkFBMkI7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDMUQsTUFBTSxFQUFFLEdBQUcsNEJBQWdCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFDbkYsUUFBUSxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNULE1BQU0sS0FBSyxPQUFPLFVBQVUsQ0FBQyxDQUFBLENBQUM7YUFDL0I7U0FDRixDQUFDLENBQUM7UUFDSCwyQkFBMkI7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxlQUFlLEdBQUcsOENBQThDLENBQUMiLCJmaWxlIjoiaW50ZXJuYWwvd2VicGFjay1jb21tb24vZGlzdC9zcGVjL3JlcGxhY2UtYW5kLWluamVjdFNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
