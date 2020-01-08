"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
// import {LLStateMachine, StateHandler, Chunk} from '../LLn-state-machine';
const json_parser_1 = __importDefault(require("../utils/json-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// import util from 'util';
// enum TokenType {
//   EOF = 0,
//   '{', '}', '[', ']', ',', ':',
//   stringLit,
//   otherLit
// }
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
describe('LLn-parser', () => {
    it('json-parser', () => __awaiter(this, void 0, void 0, function* () {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const reader = fs_1.default.createReadStream(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = yield json_parser_1.default(reader, token => {
            // console.log('token: ', token.text);
            expect(str.slice(token.pos, token.end)).toBe(token.text);
        });
        console.log('AST:', JSON.stringify(ast, null, '  '));
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlclNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zcGVjL2FzeW5jLUxMbi1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsNEVBQTRFO0FBQzVFLHVFQUE2QztBQUM3Qyw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUUzQixtQkFBbUI7QUFDbkIsYUFBYTtBQUNiLGtDQUFrQztBQUNsQyxlQUFlO0FBQ2YsYUFBYTtBQUNiLElBQUk7QUFFSixPQUFPLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxDQUFDO0FBRTFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQzFCLEVBQUUsQ0FBQyxhQUFhLEVBQUUsR0FBUyxFQUFFO1FBQzNCLE1BQU0sR0FBRyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsRUFBRSxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sTUFBTSxHQUFHLFlBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDM0csTUFBTSxHQUFHLEdBQUcsTUFBTSxxQkFBUyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtZQUMxQyxzQ0FBc0M7WUFDdEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuLy8gaW1wb3J0IHtMTFN0YXRlTWFjaGluZSwgU3RhdGVIYW5kbGVyLCBDaHVua30gZnJvbSAnLi4vTExuLXN0YXRlLW1hY2hpbmUnO1xuaW1wb3J0IHBhcnNlSnNvbiBmcm9tICcuLi91dGlscy9qc29uLXBhcnNlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcblxuLy8gZW51bSBUb2tlblR5cGUge1xuLy8gICBFT0YgPSAwLFxuLy8gICAneycsICd9JywgJ1snLCAnXScsICcsJywgJzonLFxuLy8gICBzdHJpbmdMaXQsXG4vLyAgIG90aGVyTGl0XG4vLyB9XG5cbmphc21pbmUuREVGQVVMVF9USU1FT1VUX0lOVEVSVkFMID0gMzAwMDAwO1xuXG5kZXNjcmliZSgnTExuLXBhcnNlcicsICgpID0+IHtcbiAgaXQoJ2pzb24tcGFyc2VyJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy90ZXN0Lmpzb24nKSwge2VuY29kaW5nOiAndXRmOCd9KTtcbiAgICBjb25zdCByZWFkZXIgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3Rlc3QuanNvbicpLCB7ZW5jb2Rpbmc6ICd1dGY4J30pO1xuICAgIGNvbnN0IGFzdCA9IGF3YWl0IHBhcnNlSnNvbihyZWFkZXIsIHRva2VuID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCd0b2tlbjogJywgdG9rZW4udGV4dCk7XG4gICAgICBleHBlY3Qoc3RyLnNsaWNlKHRva2VuLnBvcywgdG9rZW4uZW5kKSkudG9CZSh0b2tlbi50ZXh0KTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnQVNUOicsIEpTT04uc3RyaW5naWZ5KGFzdCwgbnVsbCwgJyAgJykpO1xuICB9KTtcblxufSk7XG5cbiJdfQ==