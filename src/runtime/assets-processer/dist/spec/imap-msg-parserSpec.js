"use strict";
/* eslint-disable no-console */
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
const imap_msg_parser_1 = require("../mail/imap-msg-parser");
const rfc822_parser_1 = require("../mail/rfc822-parser");
const rfc822_sync_parser_1 = require("../mail/rfc822-sync-parser");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
xdescribe('imap-msg-parser', () => {
    xit('createServerDataHandler() should parse string literal', (done) => {
        const handler = (0, imap_msg_parser_1.createServerDataHandler)();
        handler.output.subscribe(tks => console.log('lines:', tks), (err) => done.fail(err), () => done());
        const buf = Buffer.from('* OK 123\r\n* FETCH {14}abcdefghijklmn', 'utf8');
        handler.input(buf);
        handler.input(null);
    });
    it('parseLinesOfTokens() should work', () => __awaiter(void 0, void 0, void 0, function* () {
        const handler = (0, imap_msg_parser_1.createServerDataHandler)();
        const done = new Promise((resolve, rej) => {
            handler.output.subscribe(tks => { }, (err) => rej(err), () => resolve());
        });
        function parse() {
            return __awaiter(this, void 0, void 0, function* () {
                yield (0, imap_msg_parser_1.parseLinesOfTokens)(handler.output, (la) => __awaiter(this, void 0, void 0, function* () {
                    console.log('p1 parses line');
                    while ((yield la.la()) != null) {
                        const tk = yield la.advance();
                        console.log('p1:', tk.text);
                        if (tk.type === imap_msg_parser_1.ImapTokenType.stringLit)
                            return true;
                    }
                }));
                console.log('p1 parsing completes');
                setTimeout(() => {
                    handler.input(Buffer.from('* OK 789\r\n* FETCH2 {10}1234567890\r\n', 'utf8'));
                    handler.input(null);
                }, 0);
                yield (0, imap_msg_parser_1.parseLinesOfTokens)(handler.output, (la) => __awaiter(this, void 0, void 0, function* () {
                    console.log('p2 parses line');
                    while ((yield la.la()) != null) {
                        const tk = yield la.advance();
                        console.log('p2:', tk.text);
                    }
                }));
            });
        }
        const parseDone = parse();
        const buf = Buffer.from('* OK 123\r\n* FETCH1 {14}abcdefghijklmn\r\n', 'utf8');
        setTimeout(() => {
            handler.input(buf);
        }, 0);
        yield Promise.all([parseDone, done]);
    }));
});
describe('rfc822-parser', () => {
    xit('parse()', () => __awaiter(void 0, void 0, void 0, function* () {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg.txt'));
        console.time('async');
        const result = yield (0, rfc822_parser_1.parse)(buf);
        console.timeEnd('async');
        for (const part of result.parts) {
            console.log(part);
        }
    }));
    xit('sync parse() case 1', () => {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg.txt'));
        console.time('sync');
        const result = (0, rfc822_sync_parser_1.parse)(buf);
        console.timeEnd('sync');
        for (const part of result.parts) {
            console.log(part);
        }
    });
    it('sync parse() case 2', () => {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
        console.time('sync');
        const result = (0, rfc822_sync_parser_1.parse)(buf);
        console.timeEnd('sync');
        for (const part of result.parts) {
            console.log(part.headers);
            if (part.file)
                console.log(part.file);
            else
                console.log(part.body.toString('utf8'));
        }
    });
    it('sync parse() message without attachment', () => {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/plain-msg.txt'));
        console.time('sync');
        const result = (0, rfc822_sync_parser_1.parse)(buf);
        console.timeEnd('sync');
        console.log(result);
        // for (const part of result.parts) {
        //   console.log(part);
        // }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hcC1tc2ctcGFyc2VyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltYXAtbXNnLXBhcnNlclNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtCQUErQjs7Ozs7Ozs7Ozs7Ozs7QUFFL0IsNkRBQW1HO0FBQ25HLHlEQUE0QztBQUM1QyxtRUFBOEQ7QUFDOUQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QixTQUFTLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLEdBQUcsQ0FBQyx1REFBdUQsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLElBQUEseUNBQXVCLEdBQUUsQ0FBQztRQUMxQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDdEIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFDakMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQ3ZCLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUNiLENBQUM7UUFFRixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFTLEVBQUU7UUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBQSx5Q0FBdUIsR0FBRSxDQUFDO1FBRTFDLE1BQU0sSUFBSSxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzVDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUN4QixHQUFHLENB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TUFBTSxDQUFDLENBQUMsQ0FBQztTQUM1QztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLEdBQUcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDZCQUE2QixDQUFDLENBQUMsQ0FBQztRQUNwRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUEsMEJBQVMsRUFBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEIscUNBQXFDO1FBQ3JDLHVCQUF1QjtRQUN2QixJQUFJO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cblxuaW1wb3J0IHtjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlciwgcGFyc2VMaW5lc09mVG9rZW5zLCBJbWFwVG9rZW5UeXBlfSBmcm9tICcuLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlfSBmcm9tICcuLi9tYWlsL3JmYzgyMi1wYXJzZXInO1xuaW1wb3J0IHtwYXJzZSBhcyBwYXJzZVN5bmN9IGZyb20gJy4uL21haWwvcmZjODIyLXN5bmMtcGFyc2VyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxueGRlc2NyaWJlKCdpbWFwLW1zZy1wYXJzZXInLCAoKSA9PiB7XG4gIHhpdCgnY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKSBzaG91bGQgcGFyc2Ugc3RyaW5nIGxpdGVyYWwnLCAoZG9uZSkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICAgIGhhbmRsZXIub3V0cHV0LnN1YnNjcmliZShcbiAgICAgIHRrcyA9PiBjb25zb2xlLmxvZygnbGluZXM6JywgdGtzKSxcbiAgICAgIChlcnIpID0+IGRvbmUuZmFpbChlcnIpLFxuICAgICAgKCkgPT4gZG9uZSgpXG4gICAgKTtcblxuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKCcqIE9LIDEyM1xcclxcbiogRkVUQ0ggezE0fWFiY2RlZmdoaWprbG1uJywgJ3V0ZjgnKTtcbiAgICBoYW5kbGVyLmlucHV0KGJ1Zik7XG4gICAgaGFuZGxlci5pbnB1dChudWxsKTtcbiAgfSk7XG5cbiAgaXQoJ3BhcnNlTGluZXNPZlRva2VucygpIHNob3VsZCB3b3JrJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuXG4gICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgaGFuZGxlci5vdXRwdXQuc3Vic2NyaWJlKFxuICAgICAgICB0a3MgPT4ge30sXG4gICAgICAgIChlcnIpID0+IHJlaihlcnIpLFxuICAgICAgICAoKSA9PiByZXNvbHZlKClcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBwYXJzZSgpIHtcbiAgICAgIGF3YWl0IHBhcnNlTGluZXNPZlRva2VucyhoYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncDEgcGFyc2VzIGxpbmUnKTtcbiAgICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgdGsgPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3AxOicsIHRrLnRleHQpO1xuICAgICAgICAgIGlmICh0ay50eXBlID09PSBJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdClcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdwMSBwYXJzaW5nIGNvbXBsZXRlcycpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGhhbmRsZXIuaW5wdXQoQnVmZmVyLmZyb20oJyogT0sgNzg5XFxyXFxuKiBGRVRDSDIgezEwfTEyMzQ1Njc4OTBcXHJcXG4nLCAndXRmOCcpKTtcbiAgICAgICAgaGFuZGxlci5pbnB1dChudWxsKTtcbiAgICAgIH0sIDApO1xuICAgICAgYXdhaXQgcGFyc2VMaW5lc09mVG9rZW5zKGhhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwMiBwYXJzZXMgbGluZScpO1xuICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygncDI6JywgdGsudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZURvbmUgPSBwYXJzZSgpO1xuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKCcqIE9LIDEyM1xcclxcbiogRkVUQ0gxIHsxNH1hYmNkZWZnaGlqa2xtblxcclxcbicsICd1dGY4Jyk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBoYW5kbGVyLmlucHV0KGJ1Zik7XG4gICAgfSwgMCk7XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChbcGFyc2VEb25lLCBkb25lXSk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdyZmM4MjItcGFyc2VyJywgKCkgPT4ge1xuICB4aXQoJ3BhcnNlKCknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3JmYzgyMi1tc2cudHh0JykpO1xuICAgIGNvbnNvbGUudGltZSgnYXN5bmMnKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwYXJzZShidWYpO1xuICAgIGNvbnNvbGUudGltZUVuZCgnYXN5bmMnKTtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcmVzdWx0LnBhcnRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhwYXJ0KTtcbiAgICB9XG4gIH0pO1xuXG4gIHhpdCgnc3luYyBwYXJzZSgpIGNhc2UgMScsICgpID0+IHtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvcmZjODIyLW1zZy50eHQnKSk7XG4gICAgY29uc29sZS50aW1lKCdzeW5jJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gcGFyc2VTeW5jKGJ1Zik7XG4gICAgY29uc29sZS50aW1lRW5kKCdzeW5jJyk7XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHJlc3VsdC5wYXJ0cykge1xuICAgICAgY29uc29sZS5sb2cocGFydCk7XG4gICAgfVxuICB9KTtcblxuICBpdCgnc3luYyBwYXJzZSgpIGNhc2UgMicsICgpID0+IHtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvcmZjODIyLW1zZy0yLnR4dCcpKTtcbiAgICBjb25zb2xlLnRpbWUoJ3N5bmMnKTtcbiAgICBjb25zdCByZXN1bHQgPSBwYXJzZVN5bmMoYnVmKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ3N5bmMnKTtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcmVzdWx0LnBhcnRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhwYXJ0LmhlYWRlcnMpO1xuICAgICAgaWYgKHBhcnQuZmlsZSlcbiAgICAgICAgY29uc29sZS5sb2cocGFydC5maWxlKTtcbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5sb2cocGFydC5ib2R5IS50b1N0cmluZygndXRmOCcpKTtcbiAgICB9XG4gIH0pO1xuXG4gIGl0KCdzeW5jIHBhcnNlKCkgbWVzc2FnZSB3aXRob3V0IGF0dGFjaG1lbnQnLCAoKSA9PiB7XG4gICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3BsYWluLW1zZy50eHQnKSk7XG4gICAgY29uc29sZS50aW1lKCdzeW5jJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gcGFyc2VTeW5jKGJ1Zik7XG4gICAgY29uc29sZS50aW1lRW5kKCdzeW5jJyk7XG4gICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAvLyBmb3IgKGNvbnN0IHBhcnQgb2YgcmVzdWx0LnBhcnRzKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZyhwYXJ0KTtcbiAgICAvLyB9XG4gIH0pO1xufSk7XG4iXX0=