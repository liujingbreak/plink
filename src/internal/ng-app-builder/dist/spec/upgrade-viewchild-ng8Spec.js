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

//# sourceMappingURL=upgrade-viewchild-ng8Spec.js.map
