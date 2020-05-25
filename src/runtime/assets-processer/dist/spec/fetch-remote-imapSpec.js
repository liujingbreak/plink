"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
/**
 * drcp test -f ../web-fun-house/src/runtime/assets-processer/ts/spec/fetch-remote-imapSpec.ts -c dist/config.local.yaml conf/remote-deploy-test.yaml
 */
const fetchImap = tslib_1.__importStar(require("../fetch-remote-imap"));
const path_1 = tslib_1.__importDefault(require("path"));
const log = require('log4js').getLogger('fetch-remote-imapSpec');
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('fetch-remote-imap', () => {
    xit('can connect to server', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        fetchImap.connectImap(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            // await context.waitForReply('');
        }));
    }));
    xit('can send mail', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield fetchImap.retrySendMail('Hellow world: ' + new Date().toLocaleString(), path_1.default.resolve(__dirname, '', '../../ts/spec/fetch-remote-attachment.zip'));
    }));
    xit('can append mail by IMAP', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield context.appendMail('hellow world', 'test mail');
        }));
    }));
    it('can recieve mail', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const foundIdx = yield context.findMail(context.lastIndex, 'build artifact:pre-build(prod-admin-bcl)');
            if (foundIdx == null)
                throw new Error('Can not find the mail');
            log.info('--- find mail index ---', foundIdx);
            // const foundIdx = 8;
            const targetMail = yield context.waitForFetch(foundIdx, false);
            console.log(targetMail);
            log.info('can recieve mail - done');
        }));
    }));
    xit('can recieve mail only with text body', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const appName = 'Hellow world';
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const foundIdx = yield context.findMail(context.lastIndex, `build artifact:pre-build(test-${appName})`);
            if (foundIdx == null)
                throw new Error(`Can not find mail for "${appName}"`);
            const text = yield context.waitForFetchText(foundIdx);
            console.log('######text: %s#####', text);
            yield context.waitForReply(`FETCH ${foundIdx} BODY[2]`);
            // console.log(targetMail);
        }));
    }));
    xit('can fetch checksum and zips from mail server', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const mgr = new fetchImap.ImapManager('dev');
        console.log(yield mgr.fetchUpdateCheckSum('testApp'));
        // console.log('---------fetchOtherZips starts ----------');
        yield mgr.fetchOtherZips('testApp');
        // console.log('--------fetchOtherZips ends -----------');
    }));
    xit('can send build mail with zip file', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        // let mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum('testApp1', Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
        // mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1Qjs7R0FFRztBQUNILHdFQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRWpFLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRWpDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFTLEVBQUU7UUFDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFTLEVBQUU7WUFDL0Isa0NBQWtDO1FBQ3BDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFTLEVBQUU7UUFDOUIsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUMzQixnQkFBZ0IsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUM5QyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsQ0FDekUsQ0FBQztJQUNKLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMseUJBQXlCLEVBQUUsR0FBUyxFQUFFO1FBQ3hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0JBQWtCLEVBQUUsR0FBUyxFQUFFO1FBQ2hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7WUFDdkcsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUMsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3JELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUN4RyxJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsUUFBUSxVQUFVLENBQUMsQ0FBQztZQUN4RCwyQkFBMkI7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsOENBQThDLEVBQUUsR0FBUyxFQUFFO1FBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsNERBQTREO1FBQzVELE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQywwREFBMEQ7SUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFRLEVBQUU7UUFDakQsOENBQThDO1FBQzlDLDBIQUEwSDtRQUUxSCwwQ0FBMEM7UUFDMUMsOEdBQThHO0lBQ2hILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuLyoqXG4gKiBkcmNwIHRlc3QgLWYgLi4vd2ViLWZ1bi1ob3VzZS9zcmMvcnVudGltZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIC1jIGRpc3QvY29uZmlnLmxvY2FsLnlhbWwgY29uZi9yZW1vdGUtZGVwbG95LXRlc3QueWFtbFxuICovXG5pbXBvcnQgKiBhcyBmZXRjaEltYXAgZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2ZldGNoLXJlbW90ZS1pbWFwU3BlYycpO1xuXG5qYXNtaW5lLkRFRkFVTFRfVElNRU9VVF9JTlRFUlZBTCA9IDUgKiA2MCAqIDEwMDA7XG5cbmRlc2NyaWJlKCdmZXRjaC1yZW1vdGUtaW1hcCcsICgpID0+IHtcblxuICB4aXQoJ2NhbiBjb25uZWN0IHRvIHNlcnZlcicsIGFzeW5jICgpID0+IHtcbiAgICBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gYXdhaXQgY29udGV4dC53YWl0Rm9yUmVwbHkoJycpO1xuICAgIH0pO1xuICB9KTtcblxuICB4aXQoJ2NhbiBzZW5kIG1haWwnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLnJldHJ5U2VuZE1haWwoXG4gICAgICAnSGVsbG93IHdvcmxkOiAnICsgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpLFxuICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJycsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpXG4gICAgKTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gYXBwZW5kIG1haWwgYnkgSU1BUCcsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBhd2FpdCBjb250ZXh0LmFwcGVuZE1haWwoJ2hlbGxvdyB3b3JsZCcsICd0ZXN0IG1haWwnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ2NhbiByZWNpZXZlIG1haWwnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jIGNvbnRleHQgPT4ge1xuICAgICAgY29uc3QgZm91bmRJZHggPSBhd2FpdCBjb250ZXh0LmZpbmRNYWlsKGNvbnRleHQubGFzdEluZGV4LCAnYnVpbGQgYXJ0aWZhY3Q6cHJlLWJ1aWxkKHByb2QtYWRtaW4tYmNsKScpO1xuICAgICAgaWYgKGZvdW5kSWR4ID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmaW5kIHRoZSBtYWlsJyk7XG4gICAgICBsb2cuaW5mbygnLS0tIGZpbmQgbWFpbCBpbmRleCAtLS0nLCBmb3VuZElkeCk7XG4gICAgICAvLyBjb25zdCBmb3VuZElkeCA9IDg7XG4gICAgICBjb25zdCB0YXJnZXRNYWlsID0gYXdhaXQgY29udGV4dC53YWl0Rm9yRmV0Y2goZm91bmRJZHgsIGZhbHNlKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhcmdldE1haWwpO1xuICAgICAgbG9nLmluZm8oJ2NhbiByZWNpZXZlIG1haWwgLSBkb25lJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIHJlY2lldmUgbWFpbCBvbmx5IHdpdGggdGV4dCBib2R5JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGFwcE5hbWUgPSAnSGVsbG93IHdvcmxkJztcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBjb25zdCBmb3VuZElkeCA9IGF3YWl0IGNvbnRleHQuZmluZE1haWwoY29udGV4dC5sYXN0SW5kZXgsIGBidWlsZCBhcnRpZmFjdDpwcmUtYnVpbGQodGVzdC0ke2FwcE5hbWV9KWApO1xuICAgICAgaWYgKGZvdW5kSWR4ID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIG1haWwgZm9yIFwiJHthcHBOYW1lfVwiYCk7XG4gICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgY29udGV4dC53YWl0Rm9yRmV0Y2hUZXh0KGZvdW5kSWR4KTtcbiAgICAgIGNvbnNvbGUubG9nKCcjIyMjIyN0ZXh0OiAlcyMjIyMjJywgdGV4dCk7XG4gICAgICBhd2FpdCBjb250ZXh0LndhaXRGb3JSZXBseShgRkVUQ0ggJHtmb3VuZElkeH0gQk9EWVsyXWApO1xuICAgICAgLy8gY29uc29sZS5sb2codGFyZ2V0TWFpbCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIGZldGNoIGNoZWNrc3VtIGFuZCB6aXBzIGZyb20gbWFpbCBzZXJ2ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgbWdyID0gbmV3IGZldGNoSW1hcC5JbWFwTWFuYWdlcignZGV2Jyk7XG4gICAgY29uc29sZS5sb2coYXdhaXQgbWdyLmZldGNoVXBkYXRlQ2hlY2tTdW0oJ3Rlc3RBcHAnKSk7XG4gICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tLWZldGNoT3RoZXJaaXBzIHN0YXJ0cyAtLS0tLS0tLS0tJyk7XG4gICAgYXdhaXQgbWdyLmZldGNoT3RoZXJaaXBzKCd0ZXN0QXBwJyk7XG4gICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tZmV0Y2hPdGhlclppcHMgZW5kcyAtLS0tLS0tLS0tLScpO1xuICB9KTtcblxuICB4aXQoJ2NhbiBzZW5kIGJ1aWxkIG1haWwgd2l0aCB6aXAgZmlsZScsIGFzeW5jICgpPT4ge1xuICAgIC8vIGxldCBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICAvLyBhd2FpdCBtZ3Iuc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oJ3Rlc3RBcHAxJywgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWF0dGFjaG1lbnQuemlwJykpO1xuXG4gICAgLy8gbWdyID0gbmV3IGZldGNoSW1hcC5JbWFwTWFuYWdlcignZGV2Jyk7XG4gICAgLy8gYXdhaXQgbWdyLnNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpKTtcbiAgfSk7XG59KTtcbiJdfQ==
