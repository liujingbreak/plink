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
        const buf = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/rfc822-msg.txt'));
        yield rfc822_parser_1.parse(buf);
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvaW1hcC1tc2ctcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNEJBQTRCOzs7QUFFNUIsNkRBQW1HO0FBQ25HLHlEQUE0QztBQUM1QyxvREFBb0I7QUFDcEIsd0RBQXdCO0FBRXhCLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDaEMsR0FBRyxDQUFDLHVEQUF1RCxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDcEUsTUFBTSxPQUFPLEdBQUcseUNBQXVCLEVBQUUsQ0FBQztRQUMxQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDdEIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFDakMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQ3ZCLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUNiLENBQUM7UUFFRixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFTLEVBQUU7UUFDaEQsTUFBTSxPQUFPLEdBQUcseUNBQXVCLEVBQUUsQ0FBQztRQUUxQyxNQUFNLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDeEIsR0FBRyxDQUFDLEVBQUUsR0FBRSxDQUFDLEVBQ1QsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFDakIsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQ2hCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILFNBQWUsS0FBSzs7Z0JBQ2xCLE1BQU0sb0NBQWtCLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFNLEVBQUUsRUFBQyxFQUFFO29CQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7b0JBQzlCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRTt3QkFDOUIsTUFBTSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDNUIsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLCtCQUFhLENBQUMsU0FBUzs0QkFDckMsT0FBTyxJQUFJLENBQUM7cUJBQ2Y7Z0JBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztnQkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQ3BDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQzlFLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDTixNQUFNLG9DQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBTSxFQUFFLEVBQUMsRUFBRTtvQkFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUM5QixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUU7d0JBQzlCLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQzdCO2dCQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7WUFDTCxDQUFDO1NBQUE7UUFDRCxNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUMxQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVOLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBUyxFQUFFO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0scUJBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9zcGVjL2ltYXAtbXNnLXBhcnNlclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5cbmltcG9ydCB7Y3JlYXRlU2VydmVyRGF0YUhhbmRsZXIsIHBhcnNlTGluZXNPZlRva2VucywgSW1hcFRva2VuVHlwZX0gZnJvbSAnLi4vbWFpbC9pbWFwLW1zZy1wYXJzZXInO1xuaW1wb3J0IHtwYXJzZX0gZnJvbSAnLi4vbWFpbC9yZmM4MjItcGFyc2VyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxueGRlc2NyaWJlKCdpbWFwLW1zZy1wYXJzZXInLCAoKSA9PiB7XG4gIHhpdCgnY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKSBzaG91bGQgcGFyc2Ugc3RyaW5nIGxpdGVyYWwnLCAoZG9uZSkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICAgIGhhbmRsZXIub3V0cHV0LnN1YnNjcmliZShcbiAgICAgIHRrcyA9PiBjb25zb2xlLmxvZygnbGluZXM6JywgdGtzKSxcbiAgICAgIChlcnIpID0+IGRvbmUuZmFpbChlcnIpLFxuICAgICAgKCkgPT4gZG9uZSgpXG4gICAgKTtcblxuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKCcqIE9LIDEyM1xcclxcbiogRkVUQ0ggezE0fWFiY2RlZmdoaWprbG1uJywgJ3V0ZjgnKTtcbiAgICBoYW5kbGVyLmlucHV0KGJ1Zik7XG4gICAgaGFuZGxlci5pbnB1dChudWxsKTtcbiAgfSk7XG5cbiAgaXQoJ3BhcnNlTGluZXNPZlRva2VucygpIHNob3VsZCB3b3JrJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuXG4gICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgaGFuZGxlci5vdXRwdXQuc3Vic2NyaWJlKFxuICAgICAgICB0a3MgPT4ge30sXG4gICAgICAgIChlcnIpID0+IHJlaihlcnIpLFxuICAgICAgICAoKSA9PiByZXNvbHZlKClcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBwYXJzZSgpIHtcbiAgICAgIGF3YWl0IHBhcnNlTGluZXNPZlRva2VucyhoYW5kbGVyLm91dHB1dCwgYXN5bmMgbGEgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygncDEgcGFyc2VzIGxpbmUnKTtcbiAgICAgICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgdGsgPSBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3AxOicsIHRrLnRleHQpO1xuICAgICAgICAgIGlmICh0ay50eXBlID09PSBJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdClcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdwMSBwYXJzaW5nIGNvbXBsZXRlcycpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGhhbmRsZXIuaW5wdXQoQnVmZmVyLmZyb20oJyogT0sgNzg5XFxyXFxuKiBGRVRDSDIgezEwfTEyMzQ1Njc4OTBcXHJcXG4nLCAndXRmOCcpKTtcbiAgICAgICAgaGFuZGxlci5pbnB1dChudWxsKTtcbiAgICAgIH0sIDApO1xuICAgICAgYXdhaXQgcGFyc2VMaW5lc09mVG9rZW5zKGhhbmRsZXIub3V0cHV0LCBhc3luYyBsYSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwMiBwYXJzZXMgbGluZScpO1xuICAgICAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCB0ayA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygncDI6JywgdGsudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZURvbmUgPSBwYXJzZSgpO1xuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKCcqIE9LIDEyM1xcclxcbiogRkVUQ0gxIHsxNH1hYmNkZWZnaGlqa2xtblxcclxcbicsICd1dGY4Jyk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBoYW5kbGVyLmlucHV0KGJ1Zik7XG4gICAgfSwgMCk7XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChbcGFyc2VEb25lLCBkb25lXSk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdyZmM4MjItcGFyc2VyJywgKCkgPT4ge1xuICBpdCgncGFyc2UoKScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvcmZjODIyLW1zZy50eHQnKSk7XG4gICAgYXdhaXQgcGFyc2UoYnVmKTtcbiAgfSk7XG59KTtcbiJdfQ==
