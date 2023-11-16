"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const replace_and_inject_1 = tslib_1.__importDefault(require("../../ts/tsjs/replace-and-inject"));
const require_injector_1 = tslib_1.__importDefault(require("@wfh/plink/packages/require-injector"));
const path_1 = tslib_1.__importDefault(require("path"));
describe('replace-and-inject', () => {
    it('replace', () => {
        const rj = new require_injector_1.default({ noNode: true });
        const tsconfig = path_1.default.resolve(require.resolve('@wfh/plink/package.json'), '../wfh/tsconfig-base.json');
        // eslint-disable-next-line
        console.log('tsconfig file', tsconfig);
        rj.fromDir(__dirname).alias('lodash', 'NOTHING_BUT_LONG');
        const rs = (0, replace_and_inject_1.default)(path_1.default.resolve(__dirname, 'mock.ts'), mockFileContent, rj, tsconfig, {
            __context: {
                foobar() { return 'REPLACED'; }
            }
        });
        // eslint-disable-next-line
        console.log(rs);
    });
});
const mockFileContent = 'import _ from \'lodash\';__context.foobar();';
//# sourceMappingURL=replace-and-injectSpec.js.map