"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const imap_msg_parser_1 = require("../mail/imap-msg-parser");
const rfc822_parser_1 = require("../mail/rfc822-parser");
const rfc822_sync_parser_1 = require("../mail/rfc822-sync-parser");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
xdescribe('imap-msg-parser', () => {
    xit('createServerDataHandler() should parse string literal', (done) => {
        const handler = imap_msg_parser_1.createServerDataHandler();
        handler.output.subscribe(tks => console.log('lines:', tks), (err) => done.fail(err), () => done());
        const buf = Buffer.from('* OK 123\r\n* FETCH {14}abcdefghijklmn', 'utf8');
        handler.input(buf);
        handler.input(null);
    });
    it('parseLinesOfTokens() should work', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const handler = imap_msg_parser_1.createServerDataHandler();
        const done = new Promise((resolve, rej) => {
            handler.output.subscribe(tks => { }, (err) => rej(err), () => resolve());
        });
        function parse() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield imap_msg_parser_1.parseLinesOfTokens(handler.output, (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                yield imap_msg_parser_1.parseLinesOfTokens(handler.output, (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    xit('parse()', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
        console.time('async');
        const result = yield rfc822_parser_1.parse(buf);
        console.timeEnd('async');
        for (const part of result.parts) {
            console.log(part);
        }
    }));
    it('parse()', () => {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
        console.time('sync');
        const result = rfc822_sync_parser_1.parse(buf);
        console.timeEnd('sync');
        for (const part of result.parts) {
            console.log(part);
        }
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvaW1hcC1tc2ctcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNEJBQTRCOzs7QUFFNUIsNkRBQW1HO0FBQ25HLHlEQUE0QztBQUM1QyxtRUFBOEQ7QUFDOUQsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUV4QixTQUFTLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLEdBQUcsQ0FBQyx1REFBdUQsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLHlDQUF1QixFQUFFLENBQUM7UUFDMUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQ2pDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUN2QixHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FDYixDQUFDO1FBRUYsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxRSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0NBQWtDLEVBQUUsR0FBUyxFQUFFO1FBQ2hELE1BQU0sT0FBTyxHQUFHLHlDQUF1QixFQUFFLENBQUM7UUFFMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDdEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ3hCLEdBQUcsQ0FBQyxFQUFFLEdBQUUsQ0FBQyxFQUNULENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQ2pCLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUNoQixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFlLEtBQUs7O2dCQUNsQixNQUFNLG9DQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBTSxFQUFFLEVBQUMsRUFBRTtvQkFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUM5QixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUU7d0JBQzlCLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzVCLElBQUksRUFBRSxDQUFDLElBQUksS0FBSywrQkFBYSxDQUFDLFNBQVM7NEJBQ3JDLE9BQU8sSUFBSSxDQUFDO3FCQUNmO2dCQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNwQyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUM5RSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ04sTUFBTSxvQ0FBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQU0sRUFBRSxFQUFDLEVBQUU7b0JBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDOUIsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFO3dCQUM5QixNQUFNLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUM3QjtnQkFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztTQUFBO1FBQ0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvRSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFTixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUM3QixHQUFHLENBQUMsU0FBUyxFQUFFLEdBQVMsRUFBRTtRQUN4QixNQUFNLEdBQUcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUN2RixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLE1BQU0scUJBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtZQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO0lBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckIsTUFBTSxNQUFNLEdBQUcsMEJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtZQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3NwZWMvaW1hcC1tc2ctcGFyc2VyU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcblxuaW1wb3J0IHtjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlciwgcGFyc2VMaW5lc09mVG9rZW5zLCBJbWFwVG9rZW5UeXBlfSBmcm9tICcuLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlfSBmcm9tICcuLi9tYWlsL3JmYzgyMi1wYXJzZXInO1xuaW1wb3J0IHtwYXJzZSBhcyBwYXJzZVN5bmN9IGZyb20gJy4uL21haWwvcmZjODIyLXN5bmMtcGFyc2VyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxueGRlc2NyaWJlKCdpbWFwLW1zZy1wYXJzZXInLCAoKSA9PiB7XG4gIHhpdCgnY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKSBzaG91bGQgcGFyc2Ugc3RyaW5nIGxpdGVyYWwnLCAoZG9uZSkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICAgIGhhbmRsZXIub3V0cHV0LnN1YnNjcmliZShcbiAgICAgIHRrcyA9PiBjb25zb2xlLmxvZygnbGluZXM6JywgdGtzKSxcbiAgICAgIChlcnIpID0+IGRvbmUuZmFpbChlcnIpLFxuICAgICAgKCkgPT4gZG9uZSgpXG4gICAgKTtcblxuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKCcqIE9LIDEyM1xcclxcbiogRkVUQ0ggezE0fWFiY2RlZmdoaWprbG1uJywgJ3V0ZjgnKTtcbiAgICBoYW5kbGVyLmlucHV0KGJ1Zik7XG4gICAgaGFuZGxlci5pbnB1dChudWxsKTtcbiAgfSk7XG5cbiAgaXQoJ3BhcnNlTGluZXNPZlRva2VucygpIHNob3VsZCB3b3JrJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuXG4gICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgaGFuZGxlci5vdXRwdXQuc3Vic2NyaWJlKFxuICAgICAgICB0a3MgPT4ge30sXG4gICAgICAgIChlcnIpID0+IHJlaihlcnIpLFxuICAgICAgICAoKSA9PiByZXNvbHZlKClcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBwYXJzZSgpIHtcbiAgICAgIGF3YWl0IHBhcnNlTGluZXNPZlRva2VucyhoYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncDEgcGFyc2VzIGxpbmUnKTtcbiAgICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgdGsgPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3AxOicsIHRrLnRleHQpO1xuICAgICAgICAgIGlmICh0ay50eXBlID09PSBJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdClcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdwMSBwYXJzaW5nIGNvbXBsZXRlcycpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGhhbmRsZXIuaW5wdXQoQnVmZmVyLmZyb20oJyogT0sgNzg5XFxyXFxuKiBGRVRDSDIgezEwfTEyMzQ1Njc4OTBcXHJcXG4nLCAndXRmOCcpKTtcbiAgICAgICAgaGFuZGxlci5pbnB1dChudWxsKTtcbiAgICAgIH0sIDApO1xuICAgICAgYXdhaXQgcGFyc2VMaW5lc09mVG9rZW5zKGhhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwMiBwYXJzZXMgbGluZScpO1xuICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygncDI6JywgdGsudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZURvbmUgPSBwYXJzZSgpO1xuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKCcqIE9LIDEyM1xcclxcbiogRkVUQ0gxIHsxNH1hYmNkZWZnaGlqa2xtblxcclxcbicsICd1dGY4Jyk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBoYW5kbGVyLmlucHV0KGJ1Zik7XG4gICAgfSwgMCk7XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChbcGFyc2VEb25lLCBkb25lXSk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdyZmM4MjItcGFyc2VyJywgKCkgPT4ge1xuICB4aXQoJ3BhcnNlKCknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3JmYzgyMi1tc2ctMi50eHQnKSk7XG4gICAgY29uc29sZS50aW1lKCdhc3luYycpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlKGJ1Zik7XG4gICAgY29uc29sZS50aW1lRW5kKCdhc3luYycpO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiByZXN1bHQucGFydHMpIHtcbiAgICAgIGNvbnNvbGUubG9nKHBhcnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaXQoJ3BhcnNlKCknLCAoKSA9PiB7XG4gICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3JmYzgyMi1tc2ctMi50eHQnKSk7XG4gICAgY29uc29sZS50aW1lKCdzeW5jJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gcGFyc2VTeW5jKGJ1Zik7XG4gICAgY29uc29sZS50aW1lRW5kKCdzeW5jJyk7XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHJlc3VsdC5wYXJ0cykge1xuICAgICAgY29uc29sZS5sb2cocGFydCk7XG4gICAgfVxuICB9KTtcbn0pO1xuIl19
