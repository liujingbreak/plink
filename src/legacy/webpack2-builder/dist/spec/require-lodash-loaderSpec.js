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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZS1sb2Rhc2gtbG9hZGVyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlcXVpcmUtbG9kYXNoLWxvYWRlclNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOEJBQThCO0FBQzlCLHVEQUF3RDtBQUN4RCwrQ0FBaUM7QUFDakMsTUFBTSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsR0FBRyxNQUFNLENBQUM7QUFDaEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRTFELFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsTUFBTSxRQUFRLEdBQUc7Ozs7O0VBS2pCLENBQUM7SUFDRCxFQUFFLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQ3pELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLHNGQUFzRixDQUFDLENBQUM7SUFDdEgsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQ3pELElBQUksTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsMkZBQTJGLENBQUMsQ0FBQztJQUN4SCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxRQUFRLEdBQUc7O0dBRWxCLENBQUM7UUFDQSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGU6cXVvdGVtYXJrICovXG5pbXBvcnQgbG9hZGVyID0gcmVxdWlyZSgnLi4vbGliL3JlcXVpcmUtbG9kYXNoLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCB7ZG9FcywgVFNQYXJzZXJ9ID0gbG9hZGVyO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncmVxdWlyZS1sb2Rhc2gtbG9hZGVyU3BlYycpO1xuXG5kZXNjcmliZSgncmVxdWlyZS1sb2Rhc2gtbG9hZGVyJywgKCkgPT4ge1xuICBjb25zdCB0ZXN0Q29kZSA9IGB2YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXHRcdGZ1bmN0aW9uIGRlZigpIHtcblx0XHRcdHNvbWV0aGluZyhfLmlzU3RyaW5nKCcnKSk7XG5cdFx0XHRfLmRlYm91bmNlKCgpID0+IHt9KTtcblx0XHR9XG5cdGA7XG4gIGl0KCdzaG91bGQgcmVwbGFjZSBcInJlcXVpcmUoXFwnbG9kYXNoXFwnKVwiIGluIEVTIGZpbGUnLCAoKSA9PiB7XG4gICAgdmFyIHJlc3VsdCA9IGRvRXModGVzdENvZGUsICd0ZXN0LmpzJyk7XG4gICAgbG9nLmluZm8ocmVzdWx0WzBdKTtcbiAgICBleHBlY3QocmVzdWx0WzBdKS50b0NvbnRhaW4oXCJ2YXIgXyA9IHtpc1N0cmluZzogcmVxdWlyZSgnbG9kYXNoL2lzU3RyaW5nJyksIGRlYm91bmNlOiByZXF1aXJlKCdsb2Rhc2gvZGVib3VuY2UnKX1cIik7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgcmVwbGFjZSBcInJlcXVpcmUoXFwnbG9kYXNoXFwnKVwiIGluIFRTIGZpbGUnLCAoKSA9PiB7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBUU1BhcnNlcigpLmRvVHModGVzdENvZGUsICd0ZXN0LnRzJyk7XG4gICAgbG9nLmRlYnVnKHJlc3VsdCk7XG4gICAgZXhwZWN0KHJlc3VsdCkudG9Db250YWluKFwidmFyIF86IGFueSA9IHtpc1N0cmluZzogcmVxdWlyZSgnbG9kYXNoL2lzU3RyaW5nJyksIGRlYm91bmNlOiByZXF1aXJlKCdsb2Rhc2gvZGVib3VuY2UnKX1cIik7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgcmVtb3ZlIG9ycGhhbiByZXF1aXJlIHN0YXRlbWVudCcsICgpID0+IHtcbiAgICBjb25zdCB0ZXN0Q29kZSA9IGByZXF1aXJlKCdsb2Rhc2gnKTtcblx0XHRzb21ldGhpbmcoKTtcblx0XHRgO1xuICAgIHZhciByZXN1bHQgPSBkb0VzKHRlc3RDb2RlLCAndGVzdC5qcycpO1xuICAgIGxvZy5kZWJ1ZyhyZXN1bHRbMF0pO1xuICAgIGV4cGVjdChyZXN1bHQpLm5vdC50b0NvbnRhaW4oJ3JlcXVpcmUoXFwnbG9kYXNoXFwnKScpO1xuICB9KTtcbn0pO1xuIl19