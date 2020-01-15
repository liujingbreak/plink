"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const imap_msg_parser_1 = require("../mail/imap-msg-parser");
const rfc822_parser_1 = require("../mail/rfc822-parser");
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
    it('parse()', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
        const result = yield rfc822_parser_1.parse(buf);
        for (const part of result.parts) {
            console.log(part);
        }
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvaW1hcC1tc2ctcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNEJBQTRCOzs7QUFFNUIsNkRBQW1HO0FBQ25HLHlEQUE0QztBQUM1QyxvREFBb0I7QUFDcEIsd0RBQXdCO0FBRXhCLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDaEMsR0FBRyxDQUFDLHVEQUF1RCxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDcEUsTUFBTSxPQUFPLEdBQUcseUNBQXVCLEVBQUUsQ0FBQztRQUMxQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDdEIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFDakMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQ3ZCLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUNiLENBQUM7UUFFRixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFTLEVBQUU7UUFDaEQsTUFBTSxPQUFPLEdBQUcseUNBQXVCLEVBQUUsQ0FBQztRQUUxQyxNQUFNLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDeEIsR0FBRyxDQUFDLEVBQUUsR0FBRSxDQUFDLEVBQ1QsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFDakIsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQ2hCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILFNBQWUsS0FBSzs7Z0JBQ2xCLE1BQU0sb0NBQWtCLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFNLEVBQUUsRUFBQyxFQUFFO29CQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7b0JBQzlCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRTt3QkFDOUIsTUFBTSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDNUIsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLCtCQUFhLENBQUMsU0FBUzs0QkFDckMsT0FBTyxJQUFJLENBQUM7cUJBQ2Y7Z0JBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztnQkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQ3BDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQzlFLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDTixNQUFNLG9DQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBTSxFQUFFLEVBQUMsRUFBRTtvQkFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUM5QixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUU7d0JBQzlCLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQzdCO2dCQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7WUFDTCxDQUFDO1NBQUE7UUFDRCxNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUMxQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVOLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBUyxFQUFFO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sTUFBTSxHQUFHLE1BQU0scUJBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVoQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7WUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNuQjtJQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3NwZWMvaW1hcC1tc2ctcGFyc2VyU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcblxuaW1wb3J0IHtjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlciwgcGFyc2VMaW5lc09mVG9rZW5zLCBJbWFwVG9rZW5UeXBlfSBmcm9tICcuLi9tYWlsL2ltYXAtbXNnLXBhcnNlcic7XG5pbXBvcnQge3BhcnNlfSBmcm9tICcuLi9tYWlsL3JmYzgyMi1wYXJzZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG54ZGVzY3JpYmUoJ2ltYXAtbXNnLXBhcnNlcicsICgpID0+IHtcbiAgeGl0KCdjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpIHNob3VsZCBwYXJzZSBzdHJpbmcgbGl0ZXJhbCcsIChkb25lKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGNyZWF0ZVNlcnZlckRhdGFIYW5kbGVyKCk7XG4gICAgaGFuZGxlci5vdXRwdXQuc3Vic2NyaWJlKFxuICAgICAgdGtzID0+IGNvbnNvbGUubG9nKCdsaW5lczonLCB0a3MpLFxuICAgICAgKGVycikgPT4gZG9uZS5mYWlsKGVyciksXG4gICAgICAoKSA9PiBkb25lKClcbiAgICApO1xuXG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oJyogT0sgMTIzXFxyXFxuKiBGRVRDSCB7MTR9YWJjZGVmZ2hpamtsbW4nLCAndXRmOCcpO1xuICAgIGhhbmRsZXIuaW5wdXQoYnVmKTtcbiAgICBoYW5kbGVyLmlucHV0KG51bGwpO1xuICB9KTtcblxuICBpdCgncGFyc2VMaW5lc09mVG9rZW5zKCkgc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGNyZWF0ZVNlcnZlckRhdGFIYW5kbGVyKCk7XG5cbiAgICBjb25zdCBkb25lID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgICBoYW5kbGVyLm91dHB1dC5zdWJzY3JpYmUoXG4gICAgICAgIHRrcyA9PiB7fSxcbiAgICAgICAgKGVycikgPT4gcmVqKGVyciksXG4gICAgICAgICgpID0+IHJlc29sdmUoKVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHBhcnNlKCkge1xuICAgICAgYXdhaXQgcGFyc2VMaW5lc09mVG9rZW5zKGhhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwMSBwYXJzZXMgbGluZScpO1xuICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygncDE6JywgdGsudGV4dCk7XG4gICAgICAgICAgaWYgKHRrLnR5cGUgPT09IEltYXBUb2tlblR5cGUuc3RyaW5nTGl0KVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coJ3AxIHBhcnNpbmcgY29tcGxldGVzJyk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaGFuZGxlci5pbnB1dChCdWZmZXIuZnJvbSgnKiBPSyA3ODlcXHJcXG4qIEZFVENIMiB7MTB9MTIzNDU2Nzg5MFxcclxcbicsICd1dGY4JykpO1xuICAgICAgICBoYW5kbGVyLmlucHV0KG51bGwpO1xuICAgICAgfSwgMCk7XG4gICAgICBhd2FpdCBwYXJzZUxpbmVzT2ZUb2tlbnMoaGFuZGxlci5vdXRwdXQsIGFzeW5jIGxhID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3AyIHBhcnNlcyBsaW5lJyk7XG4gICAgICAgIHdoaWxlICgoYXdhaXQgbGEubGEoKSkgIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHRrID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdwMjonLCB0ay50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlRG9uZSA9IHBhcnNlKCk7XG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oJyogT0sgMTIzXFxyXFxuKiBGRVRDSDEgezE0fWFiY2RlZmdoaWprbG1uXFxyXFxuJywgJ3V0ZjgnKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGhhbmRsZXIuaW5wdXQoYnVmKTtcbiAgICB9LCAwKTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFtwYXJzZURvbmUsIGRvbmVdKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3JmYzgyMi1wYXJzZXInLCAoKSA9PiB7XG4gIGl0KCdwYXJzZSgpJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9yZmM4MjItbXNnLTIudHh0JykpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlKGJ1Zik7XG5cbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcmVzdWx0LnBhcnRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhwYXJ0KTtcbiAgICB9XG4gIH0pO1xufSk7XG4iXX0=
