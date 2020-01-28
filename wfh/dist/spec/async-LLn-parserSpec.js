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
    it('sync json-parser', () => {
        const str = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/test.json'), { encoding: 'utf8' });
        const ast = json_sync_parser_1.default(str);
        console.log('AST:', JSON.stringify(ast, null, '  '));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlclNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zcGVjL2FzeW5jLUxMbi1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsNEVBQTRFO0FBQzVFLHVFQUE2QztBQUM3QyxpRkFBc0Q7QUFDdEQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QixPQUFPLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxDQUFDO0FBRTFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzNCLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxHQUFTLEVBQUU7UUFDbEMsTUFBTSxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxNQUFNLEdBQUcsWUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUMzRyxNQUFNLEdBQUcsR0FBRyxNQUFNLHFCQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQzFDLHNDQUFzQztZQUN0QyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLEdBQUcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUNwRyxNQUFNLEdBQUcsR0FBRywwQkFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vLyBpbXBvcnQge0xMU3RhdGVNYWNoaW5lLCBTdGF0ZUhhbmRsZXIsIENodW5rfSBmcm9tICcuLi9MTG4tc3RhdGUtbWFjaGluZSc7XG5pbXBvcnQgcGFyc2VKc29uIGZyb20gJy4uL3V0aWxzL2pzb24tcGFyc2VyJztcbmltcG9ydCBwYXJzZUpzb25TeW5jIGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5qYXNtaW5lLkRFRkFVTFRfVElNRU9VVF9JTlRFUlZBTCA9IDMwMDAwMDtcblxuZGVzY3JpYmUoJ0pTT04gcGFyc2VyJywgKCkgPT4ge1xuICB4aXQoJ2FzeW5jIGpzb24tcGFyc2VyJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy90ZXN0Lmpzb24nKSwge2VuY29kaW5nOiAndXRmOCd9KTtcbiAgICBjb25zdCByZWFkZXIgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3Rlc3QuanNvbicpLCB7ZW5jb2Rpbmc6ICd1dGY4J30pO1xuICAgIGNvbnN0IGFzdCA9IGF3YWl0IHBhcnNlSnNvbihyZWFkZXIsIHRva2VuID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCd0b2tlbjogJywgdG9rZW4udGV4dCk7XG4gICAgICBleHBlY3Qoc3RyLnNsaWNlKHRva2VuLnBvcywgdG9rZW4uZW5kKSkudG9CZSh0b2tlbi50ZXh0KTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnQVNUOicsIEpTT04uc3RyaW5naWZ5KGFzdCwgbnVsbCwgJyAgJykpO1xuICB9KTtcblxuICBpdCgnc3luYyBqc29uLXBhcnNlcicsICgpID0+IHtcbiAgICBjb25zdCBzdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC5qc29uJyksIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gICAgY29uc3QgYXN0ID0gcGFyc2VKc29uU3luYyhzdHIpO1xuICAgIGNvbnNvbGUubG9nKCdBU1Q6JywgSlNPTi5zdHJpbmdpZnkoYXN0LCBudWxsLCAnICAnKSk7XG4gIH0pO1xuXG59KTtcblxuIl19