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
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:quotemark */
const loader = require("../lib/require-lodash-loader");
const log4js = __importStar(require("log4js"));
const { doEs, TSParser } = loader;
const log = log4js.getLogger('require-lodash-loaderSpec');
describe('require-lodash-loader', () => {
    const testCode = `var _ = require('lodash');
		function def() {
			something(_.isString(''));
			_.debounce(() => {});
		}
	`;
    it('should replace "require(\'lodash\')" in ES file', () => {
        var result = doEs(testCode, 'test.js');
        log.info(result[0]);
        expect(result[0]).toContain("var _ = {isString: require('lodash/isString'), debounce: require('lodash/debounce')}");
    });
    it('should replace "require(\'lodash\')" in TS file', () => {
        var result = new TSParser().doTs(testCode, 'test.ts');
        log.debug(result);
        expect(result).toContain("var _: any = {isString: require('lodash/isString'), debounce: require('lodash/debounce')}");
    });
    it('should remove orphan require statement', () => {
        const testCode = `require('lodash');
		something();
		`;
        var result = doEs(testCode, 'test.js');
        log.debug(result[0]);
        expect(result).not.toContain('require(\'lodash\')');
    });
});

//# sourceMappingURL=require-lodash-loaderSpec.js.map
