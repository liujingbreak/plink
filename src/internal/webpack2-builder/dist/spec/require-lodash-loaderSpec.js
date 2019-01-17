"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable:quotemark */
const loader = require("../lib/require-lodash-loader");
const log4js = tslib_1.__importStar(require("log4js"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL3NwZWMvcmVxdWlyZS1sb2Rhc2gtbG9hZGVyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4QkFBOEI7QUFDOUIsdURBQXdEO0FBQ3hELHVEQUFpQztBQUNqQyxNQUFNLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxHQUFHLE1BQU0sQ0FBQztBQUNoQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFMUQsUUFBUSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUN0QyxNQUFNLFFBQVEsR0FBRzs7Ozs7RUFLaEIsQ0FBQztJQUNGLEVBQUUsQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDMUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsc0ZBQXNGLENBQUMsQ0FBQztJQUNySCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDMUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQywyRkFBMkYsQ0FBQyxDQUFDO0lBQ3ZILENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLFFBQVEsR0FBRzs7R0FFaEIsQ0FBQztRQUNGLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9zcGVjL3JlcXVpcmUtbG9kYXNoLWxvYWRlclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZTpxdW90ZW1hcmsgKi9cbmltcG9ydCBsb2FkZXIgPSByZXF1aXJlKCcuLi9saWIvcmVxdWlyZS1sb2Rhc2gtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmNvbnN0IHtkb0VzLCBUU1BhcnNlcn0gPSBsb2FkZXI7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdyZXF1aXJlLWxvZGFzaC1sb2FkZXJTcGVjJyk7XG5cbmRlc2NyaWJlKCdyZXF1aXJlLWxvZGFzaC1sb2FkZXInLCAoKSA9PiB7XG5cdGNvbnN0IHRlc3RDb2RlID0gYHZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cdFx0ZnVuY3Rpb24gZGVmKCkge1xuXHRcdFx0c29tZXRoaW5nKF8uaXNTdHJpbmcoJycpKTtcblx0XHRcdF8uZGVib3VuY2UoKCkgPT4ge30pO1xuXHRcdH1cblx0YDtcblx0aXQoJ3Nob3VsZCByZXBsYWNlIFwicmVxdWlyZShcXCdsb2Rhc2hcXCcpXCIgaW4gRVMgZmlsZScsICgpID0+IHtcblx0XHR2YXIgcmVzdWx0ID0gZG9Fcyh0ZXN0Q29kZSwgJ3Rlc3QuanMnKTtcblx0XHRsb2cuaW5mbyhyZXN1bHRbMF0pO1xuXHRcdGV4cGVjdChyZXN1bHRbMF0pLnRvQ29udGFpbihcInZhciBfID0ge2lzU3RyaW5nOiByZXF1aXJlKCdsb2Rhc2gvaXNTdHJpbmcnKSwgZGVib3VuY2U6IHJlcXVpcmUoJ2xvZGFzaC9kZWJvdW5jZScpfVwiKTtcblx0fSk7XG5cblx0aXQoJ3Nob3VsZCByZXBsYWNlIFwicmVxdWlyZShcXCdsb2Rhc2hcXCcpXCIgaW4gVFMgZmlsZScsICgpID0+IHtcblx0XHR2YXIgcmVzdWx0ID0gbmV3IFRTUGFyc2VyKCkuZG9Ucyh0ZXN0Q29kZSwgJ3Rlc3QudHMnKTtcblx0XHRsb2cuZGVidWcocmVzdWx0KTtcblx0XHRleHBlY3QocmVzdWx0KS50b0NvbnRhaW4oXCJ2YXIgXzogYW55ID0ge2lzU3RyaW5nOiByZXF1aXJlKCdsb2Rhc2gvaXNTdHJpbmcnKSwgZGVib3VuY2U6IHJlcXVpcmUoJ2xvZGFzaC9kZWJvdW5jZScpfVwiKTtcblx0fSk7XG5cblx0aXQoJ3Nob3VsZCByZW1vdmUgb3JwaGFuIHJlcXVpcmUgc3RhdGVtZW50JywgKCkgPT4ge1xuXHRcdGNvbnN0IHRlc3RDb2RlID0gYHJlcXVpcmUoJ2xvZGFzaCcpO1xuXHRcdHNvbWV0aGluZygpO1xuXHRcdGA7XG5cdFx0dmFyIHJlc3VsdCA9IGRvRXModGVzdENvZGUsICd0ZXN0LmpzJyk7XG5cdFx0bG9nLmRlYnVnKHJlc3VsdFswXSk7XG5cdFx0ZXhwZWN0KHJlc3VsdCkubm90LnRvQ29udGFpbigncmVxdWlyZShcXCdsb2Rhc2hcXCcpJyk7XG5cdH0pO1xufSk7XG4iXX0=
