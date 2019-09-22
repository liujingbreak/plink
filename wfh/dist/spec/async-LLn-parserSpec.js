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
describe('async-LLn-parser', () => {
    it('json-parser', () => __awaiter(this, void 0, void 0, function* () {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const reader = fs_1.default.createReadStream(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = yield json_parser_1.default(reader, token => {
            expect(str.slice(token.pos, token.end)).toBe(token.text);
        });
        console.log('AST:', JSON.stringify(ast, null, '  '));
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlclNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zcGVjL2FzeW5jLUxMbi1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsNEVBQTRFO0FBQzVFLHVFQUE2QztBQUM3Qyw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUUzQixtQkFBbUI7QUFDbkIsYUFBYTtBQUNiLGtDQUFrQztBQUNsQyxlQUFlO0FBQ2YsYUFBYTtBQUNiLElBQUk7QUFFSixPQUFPLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxDQUFDO0FBRTFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsRUFBRSxDQUFDLGFBQWEsRUFBRSxHQUFTLEVBQUU7UUFDM0IsTUFBTSxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxNQUFNLEdBQUcsWUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUMzRyxNQUFNLEdBQUcsR0FBRyxNQUFNLHFCQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbi8vIGltcG9ydCB7TExTdGF0ZU1hY2hpbmUsIFN0YXRlSGFuZGxlciwgQ2h1bmt9IGZyb20gJy4uL0xMbi1zdGF0ZS1tYWNoaW5lJztcbmltcG9ydCBwYXJzZUpzb24gZnJvbSAnLi4vdXRpbHMvanNvbi1wYXJzZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5cbi8vIGVudW0gVG9rZW5UeXBlIHtcbi8vICAgRU9GID0gMCxcbi8vICAgJ3snLCAnfScsICdbJywgJ10nLCAnLCcsICc6Jyxcbi8vICAgc3RyaW5nTGl0LFxuLy8gICBvdGhlckxpdFxuLy8gfVxuXG5qYXNtaW5lLkRFRkFVTFRfVElNRU9VVF9JTlRFUlZBTCA9IDMwMDAwMDtcblxuZGVzY3JpYmUoJ2FzeW5jLUxMbi1wYXJzZXInLCAoKSA9PiB7XG4gIGl0KCdqc29uLXBhcnNlcicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBzdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC5qc29uJyksIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gICAgY29uc3QgcmVhZGVyID0gZnMuY3JlYXRlUmVhZFN0cmVhbShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy90ZXN0Lmpzb24nKSwge2VuY29kaW5nOiAndXRmOCd9KTtcbiAgICBjb25zdCBhc3QgPSBhd2FpdCBwYXJzZUpzb24ocmVhZGVyLCB0b2tlbiA9PiB7XG4gICAgICBleHBlY3Qoc3RyLnNsaWNlKHRva2VuLnBvcywgdG9rZW4uZW5kKSkudG9CZSh0b2tlbi50ZXh0KTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnQVNUOicsIEpTT04uc3RyaW5naWZ5KGFzdCwgbnVsbCwgJyAgJykpO1xuICB9KTtcblxufSk7XG5cbiJdfQ==