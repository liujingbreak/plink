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
        // let mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum('testApp1', Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
        // mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1Qjs7R0FFRztBQUNILHdFQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRWpFLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRWpDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFTLEVBQUU7UUFDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFTLEVBQUU7WUFDL0Isa0NBQWtDO1FBQ3BDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFTLEVBQUU7UUFDOUIsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUMzQixnQkFBZ0IsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUM5QyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsQ0FDekUsQ0FBQztJQUNKLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMseUJBQXlCLEVBQUUsR0FBUyxFQUFFO1FBQ3hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0JBQWtCLEVBQUUsR0FBUyxFQUFFO1FBQ2hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLCtDQUErQyxDQUFDLENBQUM7WUFDNUcsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUMsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3JELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQ0FBc0MsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUM3RyxJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsUUFBUSxVQUFVLENBQUMsQ0FBQztZQUN4RCwyQkFBMkI7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsOENBQThDLEVBQUUsR0FBUyxFQUFFO1FBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsNERBQTREO1FBQzVELE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQywwREFBMEQ7SUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFRLEVBQUU7UUFDakQsOENBQThDO1FBQzlDLDBIQUEwSDtRQUUxSCwwQ0FBMEM7UUFDMUMsOEdBQThHO0lBQ2hILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuLyoqXG4gKiBkcmNwIHRlc3QgLWYgLi4vd2ViLWZ1bi1ob3VzZS9zcmMvcnVudGltZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIC1jIGRpc3QvY29uZmlnLmxvY2FsLnlhbWwgY29uZi9yZW1vdGUtZGVwbG95LXRlc3QueWFtbFxuICovXG5pbXBvcnQgKiBhcyBmZXRjaEltYXAgZnJvbSAnLi4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2ZldGNoLXJlbW90ZS1pbWFwU3BlYycpO1xuXG5qYXNtaW5lLkRFRkFVTFRfVElNRU9VVF9JTlRFUlZBTCA9IDUgKiA2MCAqIDEwMDA7XG5cbmRlc2NyaWJlKCdmZXRjaC1yZW1vdGUtaW1hcCcsICgpID0+IHtcblxuICB4aXQoJ2NhbiBjb25uZWN0IHRvIHNlcnZlcicsIGFzeW5jICgpID0+IHtcbiAgICBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gYXdhaXQgY29udGV4dC53YWl0Rm9yUmVwbHkoJycpO1xuICAgIH0pO1xuICB9KTtcblxuICB4aXQoJ2NhbiBzZW5kIG1haWwnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLnJldHJ5U2VuZE1haWwoXG4gICAgICAnSGVsbG93IHdvcmxkOiAnICsgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpLFxuICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJycsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpXG4gICAgKTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gYXBwZW5kIG1haWwgYnkgSU1BUCcsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBhd2FpdCBjb250ZXh0LmFwcGVuZE1haWwoJ2hlbGxvdyB3b3JsZCcsICd0ZXN0IG1haWwnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ2NhbiByZWNpZXZlIG1haWwnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jIGNvbnRleHQgPT4ge1xuICAgICAgY29uc3QgZm91bmRJZHggPSBhd2FpdCBjb250ZXh0LmZpbmRNYWlsKGNvbnRleHQubGFzdEluZGV4LCAnYnVpbGQgYXJ0aWZhY3Q6Ymtqay1wcmUtYnVpbGQocHJvZC1hZG1pbi1iY2wpJyk7XG4gICAgICBpZiAoZm91bmRJZHggPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgdGhlIG1haWwnKTtcbiAgICAgIGxvZy5pbmZvKCctLS0gZmluZCBtYWlsIGluZGV4IC0tLScsIGZvdW5kSWR4KTtcbiAgICAgIC8vIGNvbnN0IGZvdW5kSWR4ID0gODtcbiAgICAgIGNvbnN0IHRhcmdldE1haWwgPSBhd2FpdCBjb250ZXh0LndhaXRGb3JGZXRjaChmb3VuZElkeCwgZmFsc2UpO1xuICAgICAgY29uc29sZS5sb2codGFyZ2V0TWFpbCk7XG4gICAgICBsb2cuaW5mbygnY2FuIHJlY2lldmUgbWFpbCAtIGRvbmUnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gcmVjaWV2ZSBtYWlsIG9ubHkgd2l0aCB0ZXh0IGJvZHknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYXBwTmFtZSA9ICdIZWxsb3cgd29ybGQnO1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kSWR4ID0gYXdhaXQgY29udGV4dC5maW5kTWFpbChjb250ZXh0Lmxhc3RJbmRleCwgYGJ1aWxkIGFydGlmYWN0OmJramstcHJlLWJ1aWxkKHRlc3QtJHthcHBOYW1lfSlgKTtcbiAgICAgIGlmIChmb3VuZElkeCA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBtYWlsIGZvciBcIiR7YXBwTmFtZX1cImApO1xuICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGNvbnRleHQud2FpdEZvckZldGNoVGV4dChmb3VuZElkeCk7XG4gICAgICBjb25zb2xlLmxvZygnIyMjIyMjdGV4dDogJXMjIyMjIycsIHRleHQpO1xuICAgICAgYXdhaXQgY29udGV4dC53YWl0Rm9yUmVwbHkoYEZFVENIICR7Zm91bmRJZHh9IEJPRFlbMl1gKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRhcmdldE1haWwpO1xuICAgIH0pO1xuICB9KTtcblxuICB4aXQoJ2NhbiBmZXRjaCBjaGVja3N1bSBhbmQgemlwcyBmcm9tIG1haWwgc2VydmVyJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIGNvbnNvbGUubG9nKGF3YWl0IG1nci5mZXRjaFVwZGF0ZUNoZWNrU3VtKCd0ZXN0QXBwJykpO1xuICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0tLS1mZXRjaE90aGVyWmlwcyBzdGFydHMgLS0tLS0tLS0tLScpO1xuICAgIGF3YWl0IG1nci5mZXRjaE90aGVyWmlwcygndGVzdEFwcCcpO1xuICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0tLWZldGNoT3RoZXJaaXBzIGVuZHMgLS0tLS0tLS0tLS0nKTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gc2VuZCBidWlsZCBtYWlsIHdpdGggemlwIGZpbGUnLCBhc3luYyAoKT0+IHtcbiAgICAvLyBsZXQgbWdyID0gbmV3IGZldGNoSW1hcC5JbWFwTWFuYWdlcignZGV2Jyk7XG4gICAgLy8gYXdhaXQgbWdyLnNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKCd0ZXN0QXBwMScsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpKTtcblxuICAgIC8vIG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIC8vIGF3YWl0IG1nci5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKSk7XG4gIH0pO1xufSk7XG4iXX0=
