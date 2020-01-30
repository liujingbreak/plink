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
            const foundIdx = yield context.findMail(context.lastIndex, 'build artifact:bkjk-pre-build(prod-admin-bcl)');
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
            const foundIdx = yield context.findMail(context.lastIndex, `build artifact:bkjk-pre-build(test-${appName})`);
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
        let mgr = new fetchImap.ImapManager('dev');
        yield mgr.sendFileAndUpdatedChecksum('testApp1', path_1.default.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
        // mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1Qjs7R0FFRztBQUNILHdFQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRWpFLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRWpDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFTLEVBQUU7UUFDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFTLEVBQUU7WUFDL0Isa0NBQWtDO1FBQ3BDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFTLEVBQUU7UUFDOUIsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUMzQixnQkFBZ0IsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUM5QyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsQ0FDekUsQ0FBQztJQUNKLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMseUJBQXlCLEVBQUUsR0FBUyxFQUFFO1FBQ3hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0JBQWtCLEVBQUUsR0FBUyxFQUFFO1FBQ2hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLCtDQUErQyxDQUFDLENBQUM7WUFDNUcsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUMsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3JELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQ0FBc0MsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUM3RyxJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsUUFBUSxVQUFVLENBQUMsQ0FBQztZQUN4RCwyQkFBMkI7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsOENBQThDLEVBQUUsR0FBUyxFQUFFO1FBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsNERBQTREO1FBQzVELE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQywwREFBMEQ7SUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFRLEVBQUU7UUFDakQsSUFBSSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sR0FBRyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7UUFFdkgsMENBQTBDO1FBQzFDLDhHQUE4RztJQUNoSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9zcGVjL2ZldGNoLXJlbW90ZS1pbWFwU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbi8qKlxuICogZHJjcCB0ZXN0IC1mIC4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9zcGVjL2ZldGNoLXJlbW90ZS1pbWFwU3BlYy50cyAtYyBkaXN0L2NvbmZpZy5sb2NhbC55YW1sIGNvbmYvcmVtb3RlLWRlcGxveS10ZXN0LnlhbWxcbiAqL1xuaW1wb3J0ICogYXMgZmV0Y2hJbWFwIGZyb20gJy4uL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdmZXRjaC1yZW1vdGUtaW1hcFNwZWMnKTtcblxuamFzbWluZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSA1ICogNjAgKiAxMDAwO1xuXG5kZXNjcmliZSgnZmV0Y2gtcmVtb3RlLWltYXAnLCAoKSA9PiB7XG5cbiAgeGl0KCdjYW4gY29ubmVjdCB0byBzZXJ2ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jICgpID0+IHtcbiAgICAgIC8vIGF3YWl0IGNvbnRleHQud2FpdEZvclJlcGx5KCcnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gc2VuZCBtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGZldGNoSW1hcC5yZXRyeVNlbmRNYWlsKFxuICAgICAgJ0hlbGxvdyB3b3JsZDogJyArIG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcnLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKVxuICAgICk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIGFwcGVuZCBtYWlsIGJ5IElNQVAnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jIGNvbnRleHQgPT4ge1xuICAgICAgYXdhaXQgY29udGV4dC5hcHBlbmRNYWlsKCdoZWxsb3cgd29ybGQnLCAndGVzdCBtYWlsJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdjYW4gcmVjaWV2ZSBtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kSWR4ID0gYXdhaXQgY29udGV4dC5maW5kTWFpbChjb250ZXh0Lmxhc3RJbmRleCwgJ2J1aWxkIGFydGlmYWN0OmJramstcHJlLWJ1aWxkKHByb2QtYWRtaW4tYmNsKScpO1xuICAgICAgaWYgKGZvdW5kSWR4ID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmaW5kIHRoZSBtYWlsJyk7XG4gICAgICBsb2cuaW5mbygnLS0tIGZpbmQgbWFpbCBpbmRleCAtLS0nLCBmb3VuZElkeCk7XG4gICAgICAvLyBjb25zdCBmb3VuZElkeCA9IDg7XG4gICAgICBjb25zdCB0YXJnZXRNYWlsID0gYXdhaXQgY29udGV4dC53YWl0Rm9yRmV0Y2goZm91bmRJZHgsIGZhbHNlKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhcmdldE1haWwpO1xuICAgICAgbG9nLmluZm8oJ2NhbiByZWNpZXZlIG1haWwgLSBkb25lJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIHJlY2lldmUgbWFpbCBvbmx5IHdpdGggdGV4dCBib2R5JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGFwcE5hbWUgPSAnSGVsbG93IHdvcmxkJztcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBjb25zdCBmb3VuZElkeCA9IGF3YWl0IGNvbnRleHQuZmluZE1haWwoY29udGV4dC5sYXN0SW5kZXgsIGBidWlsZCBhcnRpZmFjdDpia2prLXByZS1idWlsZCh0ZXN0LSR7YXBwTmFtZX0pYCk7XG4gICAgICBpZiAoZm91bmRJZHggPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgbWFpbCBmb3IgXCIke2FwcE5hbWV9XCJgKTtcbiAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBjb250ZXh0LndhaXRGb3JGZXRjaFRleHQoZm91bmRJZHgpO1xuICAgICAgY29uc29sZS5sb2coJyMjIyMjI3RleHQ6ICVzIyMjIyMnLCB0ZXh0KTtcbiAgICAgIGF3YWl0IGNvbnRleHQud2FpdEZvclJlcGx5KGBGRVRDSCAke2ZvdW5kSWR4fSBCT0RZWzJdYCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0YXJnZXRNYWlsKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gZmV0Y2ggY2hlY2tzdW0gYW5kIHppcHMgZnJvbSBtYWlsIHNlcnZlcicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICBjb25zb2xlLmxvZyhhd2FpdCBtZ3IuZmV0Y2hVcGRhdGVDaGVja1N1bSgndGVzdEFwcCcpKTtcbiAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS0tZmV0Y2hPdGhlclppcHMgc3RhcnRzIC0tLS0tLS0tLS0nKTtcbiAgICBhd2FpdCBtZ3IuZmV0Y2hPdGhlclppcHMoJ3Rlc3RBcHAnKTtcbiAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS1mZXRjaE90aGVyWmlwcyBlbmRzIC0tLS0tLS0tLS0tJyk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIHNlbmQgYnVpbGQgbWFpbCB3aXRoIHppcCBmaWxlJywgYXN5bmMgKCk9PiB7XG4gICAgbGV0IG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIGF3YWl0IG1nci5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bSgndGVzdEFwcDEnLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKSk7XG5cbiAgICAvLyBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICAvLyBhd2FpdCBtZ3Iuc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWF0dGFjaG1lbnQuemlwJykpO1xuICB9KTtcbn0pO1xuIl19
