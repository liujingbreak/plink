"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable no-console */
// eslint-disable  no-console
// import {LLStateMachine, StateHandler, Chunk} from '../LLn-state-machine';
const json_parser_1 = tslib_1.__importDefault(require("../utils/json-parser"));
const json_sync_parser_1 = tslib_1.__importDefault(require("../utils/json-sync-parser"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
describe('JSON parser', () => {
    xit('async json-parser', async () => {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const reader = fs_1.default.createReadStream(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = await (0, json_parser_1.default)(reader, token => {
            // console.log('token: ', token.text);
            expect(str.slice(token.pos, token.end)).toBe(token.text);
        });
        console.log('AST:', JSON.stringify(ast, null, '  '));
    });
    it('sync json-parser', () => {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = (0, json_sync_parser_1.default)(str);
        console.log('AST:', JSON.stringify(ast, null, '  '));
    });
});
//# sourceMappingURL=async-LLn-parserSpec.js.map