"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
// eslint-disable  no-console
// import {LLStateMachine, StateHandler, Chunk} from '../LLn-state-machine';
const json_parser_1 = __importDefault(require("../utils/json-parser"));
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
describe('JSON parser', () => {
    xit('async json-parser', () => __awaiter(void 0, void 0, void 0, function* () {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const reader = fs_1.default.createReadStream(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = yield (0, json_parser_1.default)(reader, token => {
            // console.log('token: ', token.text);
            expect(str.slice(token.pos, token.end)).toBe(token.text);
        });
        console.log('AST:', JSON.stringify(ast, null, '  '));
    }));
    it('sync json-parser', () => {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = (0, json_sync_parser_1.default)(str);
        console.log('AST:', JSON.stringify(ast, null, '  '));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlclNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zcGVjL2FzeW5jLUxMbi1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDZCQUE2QjtBQUM3Qiw0RUFBNEU7QUFDNUUsdUVBQTZDO0FBQzdDLGlGQUFzRDtBQUN0RCw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBRXhCLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxNQUFNLENBQUM7QUFFMUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDM0IsR0FBRyxDQUFDLG1CQUFtQixFQUFFLEdBQVMsRUFBRTtRQUNsQyxNQUFNLEdBQUcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUNwRyxNQUFNLE1BQU0sR0FBRyxZQUFFLENBQUMsZ0JBQWdCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsRUFBRSxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBQzNHLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBQSxxQkFBUyxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtZQUMxQyxzQ0FBc0M7WUFDdEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxHQUFHLEdBQUcsSUFBQSwwQkFBYSxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vLyBlc2xpbnQtZGlzYWJsZSAgbm8tY29uc29sZVxuLy8gaW1wb3J0IHtMTFN0YXRlTWFjaGluZSwgU3RhdGVIYW5kbGVyLCBDaHVua30gZnJvbSAnLi4vTExuLXN0YXRlLW1hY2hpbmUnO1xuaW1wb3J0IHBhcnNlSnNvbiBmcm9tICcuLi91dGlscy9qc29uLXBhcnNlcic7XG5pbXBvcnQgcGFyc2VKc29uU3luYyBmcm9tICcuLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuamFzbWluZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSAzMDAwMDA7XG5cbmRlc2NyaWJlKCdKU09OIHBhcnNlcicsICgpID0+IHtcbiAgeGl0KCdhc3luYyBqc29uLXBhcnNlcicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBzdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC5qc29uJyksIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gICAgY29uc3QgcmVhZGVyID0gZnMuY3JlYXRlUmVhZFN0cmVhbShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy90ZXN0Lmpzb24nKSwge2VuY29kaW5nOiAndXRmOCd9KTtcbiAgICBjb25zdCBhc3QgPSBhd2FpdCBwYXJzZUpzb24ocmVhZGVyLCB0b2tlbiA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZygndG9rZW46ICcsIHRva2VuLnRleHQpO1xuICAgICAgZXhwZWN0KHN0ci5zbGljZSh0b2tlbi5wb3MsIHRva2VuLmVuZCkpLnRvQmUodG9rZW4udGV4dCk7XG4gICAgfSk7XG4gICAgY29uc29sZS5sb2coJ0FTVDonLCBKU09OLnN0cmluZ2lmeShhc3QsIG51bGwsICcgICcpKTtcbiAgfSk7XG5cbiAgaXQoJ3N5bmMganNvbi1wYXJzZXInLCAoKSA9PiB7XG4gICAgY29uc3Qgc3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3Rlc3QuanNvbicpLCB7ZW5jb2Rpbmc6ICd1dGY4J30pO1xuICAgIGNvbnN0IGFzdCA9IHBhcnNlSnNvblN5bmMoc3RyKTtcbiAgICBjb25zb2xlLmxvZygnQVNUOicsIEpTT04uc3RyaW5naWZ5KGFzdCwgbnVsbCwgJyAgJykpO1xuICB9KTtcblxufSk7XG5cbiJdfQ==