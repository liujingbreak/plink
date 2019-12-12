"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
/**
 * drcp test -f ../web-fun-house/src/runtime/assets-processer/ts/spec/fetch-remote-imapSpec.ts -c dist/config.local.yaml conf/remote-deploy-test.yaml
 */
const fetchImap = tslib_1.__importStar(require("../fetch-remote-imap"));
const path_1 = tslib_1.__importDefault(require("path"));
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('fetch-remote-imap', () => {
    it('can connect to server', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        fetchImap.connectImap(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            // await context.waitForReply('');
        }));
    }));
    xit('can send mail', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield fetchImap.retrySendMail('Hellow world: ' + new Date().toLocaleString(), path_1.default.resolve(__dirname, '', '../../ts/spec/fetch-remote-attachment.zip'));
    }));
    xit('can recieve mail', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const appName = 'bcl';
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const foundIdx = yield context.findMail(context.lastIndex, `build artifact: ${appName}:`);
            if (foundIdx == null)
                throw new Error(`Can not find mail for "${appName}"`);
            const targetMail = yield context.waitForFetch(foundIdx, false);
            console.log(targetMail);
        }));
    }));
    xit('can recieve mail only with text body', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const appName = 'Hellow world';
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const foundIdx = yield context.findMail(context.lastIndex, `build artifact: ${appName}:`);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1Qjs7R0FFRztBQUNILHdFQUFrRDtBQUNsRCx3REFBd0I7QUFFeEIsT0FBTyxDQUFDLHdCQUF3QixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBRWpELFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFFakMsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEdBQVMsRUFBRTtRQUNyQyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQVMsRUFBRTtZQUMvQixrQ0FBa0M7UUFDcEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsZUFBZSxFQUFFLEdBQVMsRUFBRTtRQUM5QixNQUFNLFNBQVMsQ0FBQyxhQUFhLENBQzNCLGdCQUFnQixHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLEVBQzlDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSwyQ0FBMkMsQ0FBQyxDQUN6RSxDQUFDO0lBQ0osQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxHQUFTLEVBQUU7UUFDakMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLG1CQUFtQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQzFGLElBQUksUUFBUSxJQUFJLElBQUk7Z0JBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDeEQsTUFBTSxVQUFVLEdBQUcsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMvRCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLHNDQUFzQyxFQUFFLEdBQVMsRUFBRTtRQUNyRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7UUFDL0IsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQU0sT0FBTyxFQUFDLEVBQUU7WUFDMUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDMUYsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUN4RCxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLFFBQVEsVUFBVSxDQUFDLENBQUM7WUFDeEQsMkJBQTJCO1FBQzdCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLDhDQUE4QyxFQUFFLEdBQVMsRUFBRTtRQUM3RCxNQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3RELDREQUE0RDtRQUM1RCxNQUFNLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEMsMERBQTBEO0lBQzVELENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsbUNBQW1DLEVBQUUsR0FBUSxFQUFFO1FBQ2pELElBQUksR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxNQUFNLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkNBQTJDLENBQUMsQ0FBQyxDQUFDO1FBRXZILDBDQUEwQztRQUMxQyw4R0FBOEc7SUFDaEgsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3Qvc3BlYy9mZXRjaC1yZW1vdGUtaW1hcFNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vKipcbiAqIGRyY3AgdGVzdCAtZiAuLi93ZWItZnVuLWhvdXNlL3NyYy9ydW50aW1lL2Fzc2V0cy1wcm9jZXNzZXIvdHMvc3BlYy9mZXRjaC1yZW1vdGUtaW1hcFNwZWMudHMgLWMgZGlzdC9jb25maWcubG9jYWwueWFtbCBjb25mL3JlbW90ZS1kZXBsb3ktdGVzdC55YW1sXG4gKi9cbmltcG9ydCAqIGFzIGZldGNoSW1hcCBmcm9tICcuLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuamFzbWluZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSA1ICogNjAgKiAxMDAwO1xuXG5kZXNjcmliZSgnZmV0Y2gtcmVtb3RlLWltYXAnLCAoKSA9PiB7XG5cbiAgaXQoJ2NhbiBjb25uZWN0IHRvIHNlcnZlcicsIGFzeW5jICgpID0+IHtcbiAgICBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gYXdhaXQgY29udGV4dC53YWl0Rm9yUmVwbHkoJycpO1xuICAgIH0pO1xuICB9KTtcblxuICB4aXQoJ2NhbiBzZW5kIG1haWwnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLnJldHJ5U2VuZE1haWwoXG4gICAgICAnSGVsbG93IHdvcmxkOiAnICsgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpLFxuICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJycsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpXG4gICAgKTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gcmVjaWV2ZSBtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGFwcE5hbWUgPSAnYmNsJztcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBjb25zdCBmb3VuZElkeCA9IGF3YWl0IGNvbnRleHQuZmluZE1haWwoY29udGV4dC5sYXN0SW5kZXgsIGBidWlsZCBhcnRpZmFjdDogJHthcHBOYW1lfTpgKTtcbiAgICAgIGlmIChmb3VuZElkeCA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBtYWlsIGZvciBcIiR7YXBwTmFtZX1cImApO1xuICAgICAgY29uc3QgdGFyZ2V0TWFpbCA9IGF3YWl0IGNvbnRleHQud2FpdEZvckZldGNoKGZvdW5kSWR4LCBmYWxzZSk7XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRNYWlsKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gcmVjaWV2ZSBtYWlsIG9ubHkgd2l0aCB0ZXh0IGJvZHknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYXBwTmFtZSA9ICdIZWxsb3cgd29ybGQnO1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kSWR4ID0gYXdhaXQgY29udGV4dC5maW5kTWFpbChjb250ZXh0Lmxhc3RJbmRleCwgYGJ1aWxkIGFydGlmYWN0OiAke2FwcE5hbWV9OmApO1xuICAgICAgaWYgKGZvdW5kSWR4ID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIG1haWwgZm9yIFwiJHthcHBOYW1lfVwiYCk7XG4gICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgY29udGV4dC53YWl0Rm9yRmV0Y2hUZXh0KGZvdW5kSWR4KTtcbiAgICAgIGNvbnNvbGUubG9nKCcjIyMjIyN0ZXh0OiAlcyMjIyMjJywgdGV4dCk7XG4gICAgICBhd2FpdCBjb250ZXh0LndhaXRGb3JSZXBseShgRkVUQ0ggJHtmb3VuZElkeH0gQk9EWVsyXWApO1xuICAgICAgLy8gY29uc29sZS5sb2codGFyZ2V0TWFpbCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIGZldGNoIGNoZWNrc3VtIGFuZCB6aXBzIGZyb20gbWFpbCBzZXJ2ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgbWdyID0gbmV3IGZldGNoSW1hcC5JbWFwTWFuYWdlcignZGV2Jyk7XG4gICAgY29uc29sZS5sb2coYXdhaXQgbWdyLmZldGNoVXBkYXRlQ2hlY2tTdW0oJ3Rlc3RBcHAnKSk7XG4gICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tLWZldGNoT3RoZXJaaXBzIHN0YXJ0cyAtLS0tLS0tLS0tJyk7XG4gICAgYXdhaXQgbWdyLmZldGNoT3RoZXJaaXBzKCd0ZXN0QXBwJyk7XG4gICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tZmV0Y2hPdGhlclppcHMgZW5kcyAtLS0tLS0tLS0tLScpO1xuICB9KTtcblxuICB4aXQoJ2NhbiBzZW5kIGJ1aWxkIG1haWwgd2l0aCB6aXAgZmlsZScsIGFzeW5jICgpPT4ge1xuICAgIGxldCBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICBhd2FpdCBtZ3Iuc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oJ3Rlc3RBcHAxJywgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWF0dGFjaG1lbnQuemlwJykpO1xuXG4gICAgLy8gbWdyID0gbmV3IGZldGNoSW1hcC5JbWFwTWFuYWdlcignZGV2Jyk7XG4gICAgLy8gYXdhaXQgbWdyLnNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpKTtcbiAgfSk7XG59KTtcbiJdfQ==
