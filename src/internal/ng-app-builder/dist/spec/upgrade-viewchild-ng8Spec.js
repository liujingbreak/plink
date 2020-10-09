"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const upgrade_viewchild_ng8_1 = require("../utils/upgrade-viewchild-ng8");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('ViewChild transformer', () => {
    it('should work', () => {
        const content = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/upgrade-viewchild-ng8-sample.txt'), 'utf8');
        const newContent = upgrade_viewchild_ng8_1.transform(content, 'test view child upgrade');
        // tslint:disable-next-line: no-console
        console.log(newContent);
        // expect(newContent)
        // TODO
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3VwZ3JhZGUtdmlld2NoaWxkLW5nOFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwRUFBeUQ7QUFDekQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QixRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FDMUMsU0FBUyxFQUFFLGdEQUFnRCxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEUsTUFBTSxVQUFVLEdBQUcsaUNBQVMsQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNqRSx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QixxQkFBcUI7UUFDckIsT0FBTztJQUNULENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC9zcGVjL3VwZ3JhZGUtdmlld2NoaWxkLW5nOFNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
