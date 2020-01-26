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
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
describe('JSON parser', () => {
    xit('async json-parser', () => __awaiter(this, void 0, void 0, function* () {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const reader = fs_1.default.createReadStream(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = yield json_parser_1.default(reader, token => {
            // console.log('token: ', token.text);
            expect(str.slice(token.pos, token.end)).toBe(token.text);
        });
        console.log('AST:', JSON.stringify(ast, null, '  '));
    }));
    it('json-parser', () => {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = json_sync_parser_1.default(str, token => {
            expect(str.slice(token.pos, token.end)).toBe(token.text);
        });
        console.log('AST:', JSON.stringify(ast, null, '  '));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlclNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zcGVjL2FzeW5jLUxMbi1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsNEVBQTRFO0FBQzVFLHVFQUE2QztBQUM3QyxpRkFBc0Q7QUFDdEQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QixPQUFPLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxDQUFDO0FBRTFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzNCLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxHQUFTLEVBQUU7UUFDbEMsTUFBTSxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxNQUFNLEdBQUcsWUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUMzRyxNQUFNLEdBQUcsR0FBRyxNQUFNLHFCQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQzFDLHNDQUFzQztZQUN0QyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxHQUFHLEdBQUcsMEJBQWEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDckMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbi8vIGltcG9ydCB7TExTdGF0ZU1hY2hpbmUsIFN0YXRlSGFuZGxlciwgQ2h1bmt9IGZyb20gJy4uL0xMbi1zdGF0ZS1tYWNoaW5lJztcbmltcG9ydCBwYXJzZUpzb24gZnJvbSAnLi4vdXRpbHMvanNvbi1wYXJzZXInO1xuaW1wb3J0IHBhcnNlSnNvblN5bmMgZnJvbSAnLi4vdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmphc21pbmUuREVGQVVMVF9USU1FT1VUX0lOVEVSVkFMID0gMzAwMDAwO1xuXG5kZXNjcmliZSgnSlNPTiBwYXJzZXInLCAoKSA9PiB7XG4gIHhpdCgnYXN5bmMganNvbi1wYXJzZXInLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgc3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3Rlc3QuanNvbicpLCB7ZW5jb2Rpbmc6ICd1dGY4J30pO1xuICAgIGNvbnN0IHJlYWRlciA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC5qc29uJyksIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gICAgY29uc3QgYXN0ID0gYXdhaXQgcGFyc2VKc29uKHJlYWRlciwgdG9rZW4gPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coJ3Rva2VuOiAnLCB0b2tlbi50ZXh0KTtcbiAgICAgIGV4cGVjdChzdHIuc2xpY2UodG9rZW4ucG9zLCB0b2tlbi5lbmQpKS50b0JlKHRva2VuLnRleHQpO1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCdBU1Q6JywgSlNPTi5zdHJpbmdpZnkoYXN0LCBudWxsLCAnICAnKSk7XG4gIH0pO1xuXG4gIGl0KCdqc29uLXBhcnNlcicsICgpID0+IHtcbiAgICBjb25zdCBzdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC5qc29uJyksIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gICAgY29uc3QgYXN0ID0gcGFyc2VKc29uU3luYyhzdHIsIHRva2VuID0+IHtcbiAgICAgIGV4cGVjdChzdHIuc2xpY2UodG9rZW4ucG9zLCB0b2tlbi5lbmQpKS50b0JlKHRva2VuLnRleHQpO1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCdBU1Q6JywgSlNPTi5zdHJpbmdpZnkoYXN0LCBudWxsLCAnICAnKSk7XG4gIH0pO1xuXG59KTtcblxuIl19