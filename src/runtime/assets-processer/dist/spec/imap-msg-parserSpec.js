"use strict";
// tslint:disable:no-console
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
        const handler = imap_msg_parser_1.createServerDataHandler();
        handler.output.subscribe(tks => console.log('lines:', tks), (err) => done.fail(err), () => done());
        const buf = Buffer.from('* OK 123\r\n* FETCH {14}abcdefghijklmn', 'utf8');
        handler.input(buf);
        handler.input(null);
    });
    it('parseLinesOfTokens() should work', () => __awaiter(void 0, void 0, void 0, function* () {
        const handler = imap_msg_parser_1.createServerDataHandler();
        const done = new Promise((resolve, rej) => {
            handler.output.subscribe(tks => { }, (err) => rej(err), () => resolve());
        });
        function parse() {
            return __awaiter(this, void 0, void 0, function* () {
                yield imap_msg_parser_1.parseLinesOfTokens(handler.output, (la) => __awaiter(this, void 0, void 0, function* () {
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
                yield imap_msg_parser_1.parseLinesOfTokens(handler.output, (la) => __awaiter(this, void 0, void 0, function* () {
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
        const result = yield rfc822_parser_1.parse(buf);
        console.timeEnd('async');
        for (const part of result.parts) {
            console.log(part);
        }
    }));
    xit('sync parse() case 1', () => {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg.txt'));
        console.time('sync');
        const result = rfc822_sync_parser_1.parse(buf);
        console.timeEnd('sync');
        for (const part of result.parts) {
            console.log(part);
        }
    });
    it('sync parse() case 2', () => {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
        console.time('sync');
        const result = rfc822_sync_parser_1.parse(buf);
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
        const result = rfc822_sync_parser_1.parse(buf);
        console.timeEnd('sync');
        console.log(result);
        // for (const part of result.parts) {
        //   console.log(part);
        // }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hcC1tc2ctcGFyc2VyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltYXAtbXNnLXBhcnNlclNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRCQUE0Qjs7Ozs7Ozs7Ozs7Ozs7QUFFNUIsNkRBQW1HO0FBQ25HLHlEQUE0QztBQUM1QyxtRUFBOEQ7QUFDOUQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QixTQUFTLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLEdBQUcsQ0FBQyx1REFBdUQsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLHlDQUF1QixFQUFFLENBQUM7UUFDMUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQ2pDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUN2QixHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FDYixDQUFDO1FBRUYsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxRSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0NBQWtDLEVBQUUsR0FBUyxFQUFFO1FBQ2hELE1BQU0sT0FBTyxHQUFHLHlDQUF1QixFQUFFLENBQUM7UUFFMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDNUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ3hCLEdBQUcsQ0FBQyxFQUFFLEdB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LENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDakQsTUFBTSxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7UUFDcEYsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQixNQUFNLE1BQU0sR0FBRywwQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQixxQ0FBcUM7UUFDckMsdUJBQXVCO1FBQ3ZCLElBQUk7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuXG5pbXBvcnQge2NyZWF0ZVNlcnZlckRhdGFIYW5kbGVyLCBwYXJzZUxpbmVzT2ZUb2tlbnMsIEltYXBUb2tlblR5cGV9IGZyb20gJy4uL21haWwvaW1hcC1tc2ctcGFyc2VyJztcbmltcG9ydCB7cGFyc2V9IGZyb20gJy4uL21haWwvcmZjODIyLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlIGFzIHBhcnNlU3luY30gZnJvbSAnLi4vbWFpbC9yZmM4MjItc3luYy1wYXJzZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG54ZGVzY3JpYmUoJ2ltYXAtbXNnLXBhcnNlcicsICgpID0+IHtcbiAgeGl0KCdjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpIHNob3VsZCBwYXJzZSBzdHJpbmcgbGl0ZXJhbCcsIChkb25lKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGNyZWF0ZVNlcnZlckRhdGFIYW5kbGVyKCk7XG4gICAgaGFuZGxlci5vdXRwdXQuc3Vic2NyaWJlKFxuICAgICAgdGtzID0+IGNvbnNvbGUubG9nKCdsaW5lczonLCB0a3MpLFxuICAgICAgKGVycikgPT4gZG9uZS5mYWlsKGVyciksXG4gICAgICAoKSA9PiBkb25lKClcbiAgICApO1xuXG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oJyogT0sgMTIzXFxyXFxuKiBGRVRDSCB7MTR9YWJjZGVmZ2hpamtsbW4nLCAndXRmOCcpO1xuICAgIGhhbmRsZXIuaW5wdXQoYnVmKTtcbiAgICBoYW5kbGVyLmlucHV0KG51bGwpO1xuICB9KTtcblxuICBpdCgncGFyc2VMaW5lc09mVG9rZW5zKCkgc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGNyZWF0ZVNlcnZlckRhdGFIYW5kbGVyKCk7XG5cbiAgICBjb25zdCBkb25lID0gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgICBoYW5kbGVyLm91dHB1dC5zdWJzY3JpYmUoXG4gICAgICAgIHRrcyA9PiB7fSxcbiAgICAgICAgKGVycikgPT4gcmVqKGVyciksXG4gICAgICAgICgpID0+IHJlc29sdmUoKVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHBhcnNlKCkge1xuICAgICAgYXdhaXQgcGFyc2VMaW5lc09mVG9rZW5zKGhhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwMSBwYXJzZXMgbGluZScpO1xuICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygncDE6JywgdGsudGV4dCk7XG4gICAgICAgICAgaWYgKHRrLnR5cGUgPT09IEltYXBUb2tlblR5cGUuc3RyaW5nTGl0KVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coJ3AxIHBhcnNpbmcgY29tcGxldGVzJyk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaGFuZGxlci5pbnB1dChCdWZmZXIuZnJvbSgnKiBPSyA3ODlcXHJcXG4qIEZFVENIMiB7MTB9MTIzNDU2Nzg5MFxcclxcbicsICd1dGY4JykpO1xuICAgICAgICBoYW5kbGVyLmlucHV0KG51bGwpO1xuICAgICAgfSwgMCk7XG4gICAgICBhd2FpdCBwYXJzZUxpbmVzT2ZUb2tlbnMoaGFuZGxlci5vdXRwdXQsIGFzeW5jIGxhID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3AyIHBhcnNlcyBsaW5lJyk7XG4gICAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHRrID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdwMjonLCB0ay50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlRG9uZSA9IHBhcnNlKCk7XG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oJyogT0sgMTIzXFxyXFxuKiBGRVRDSDEgezE0fWFiY2RlZmdoaWprbG1uXFxyXFxuJywgJ3V0ZjgnKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGhhbmRsZXIuaW5wdXQoYnVmKTtcbiAgICB9LCAwKTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFtwYXJzZURvbmUsIGRvbmVdKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3JmYzgyMi1wYXJzZXInLCAoKSA9PiB7XG4gIHhpdCgncGFyc2UoKScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvcmZjODIyLW1zZy50eHQnKSk7XG4gICAgY29uc29sZS50aW1lKCdhc3luYycpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlKGJ1Zik7XG4gICAgY29uc29sZS50aW1lRW5kKCdhc3luYycpO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiByZXN1bHQucGFydHMpIHtcbiAgICAgIGNvbnNvbGUubG9nKHBhcnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgeGl0KCdzeW5jIHBhcnNlKCkgY2FzZSAxJywgKCkgPT4ge1xuICAgIGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9yZmM4MjItbXNnLnR4dCcpKTtcbiAgICBjb25zb2xlLnRpbWUoJ3N5bmMnKTtcbiAgICBjb25zdCByZXN1bHQgPSBwYXJzZVN5bmMoYnVmKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ3N5bmMnKTtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcmVzdWx0LnBhcnRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhwYXJ0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGl0KCdzeW5jIHBhcnNlKCkgY2FzZSAyJywgKCkgPT4ge1xuICAgIGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9yZmM4MjItbXNnLTIudHh0JykpO1xuICAgIGNvbnNvbGUudGltZSgnc3luYycpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHBhcnNlU3luYyhidWYpO1xuICAgIGNvbnNvbGUudGltZUVuZCgnc3luYycpO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiByZXN1bHQucGFydHMpIHtcbiAgICAgIGNvbnNvbGUubG9nKHBhcnQuaGVhZGVycyk7XG4gICAgICBpZiAocGFydC5maWxlKVxuICAgICAgICBjb25zb2xlLmxvZyhwYXJ0LmZpbGUpO1xuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmxvZyhwYXJ0LmJvZHkhLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgIH1cbiAgfSk7XG5cbiAgaXQoJ3N5bmMgcGFyc2UoKSBtZXNzYWdlIHdpdGhvdXQgYXR0YWNobWVudCcsICgpID0+IHtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvcGxhaW4tbXNnLnR4dCcpKTtcbiAgICBjb25zb2xlLnRpbWUoJ3N5bmMnKTtcbiAgICBjb25zdCByZXN1bHQgPSBwYXJzZVN5bmMoYnVmKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ3N5bmMnKTtcbiAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgIC8vIGZvciAoY29uc3QgcGFydCBvZiByZXN1bHQucGFydHMpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKHBhcnQpO1xuICAgIC8vIH1cbiAgfSk7XG59KTtcbiJdfQ==