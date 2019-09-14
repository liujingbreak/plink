"use strict";
// tslint:disable no-console
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fetchImap = tslib_1.__importStar(require("../fetch-remote-imap"));
const path_1 = tslib_1.__importDefault(require("path"));
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('fetch-remote-imap', () => {
    xit('can send mail', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield fetchImap.retrySendMail('Hellow world: ' + new Date().toLocaleString(), path_1.default.resolve(__dirname, '', '../../ts/spec/fetch-remote-attachment.zip'));
    }));
    xit('can recieve mail', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const appName = 'Hellow world';
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
    it('can fetch checksum and zips from mail server', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw0QkFBNEI7OztBQUU1Qix3RUFBa0Q7QUFDbEQsd0RBQXdCO0FBRXhCLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRWpDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBUyxFQUFFO1FBQzlCLE1BQU0sU0FBUyxDQUFDLGFBQWEsQ0FDM0IsZ0JBQWdCLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUsRUFDOUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLDJDQUEyQyxDQUFDLENBQ3pFLENBQUM7SUFDSixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEdBQVMsRUFBRTtRQUNqQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7UUFDL0IsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQU0sT0FBTyxFQUFDLEVBQUU7WUFDMUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDMUYsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUN4RCxNQUFNLFVBQVUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3JELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUMxRixJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsUUFBUSxVQUFVLENBQUMsQ0FBQztZQUN4RCwyQkFBMkI7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsOENBQThDLEVBQUUsR0FBUyxFQUFFO1FBQzVELE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsNERBQTREO1FBQzVELE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQywwREFBMEQ7SUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFRLEVBQUU7UUFDakQsSUFBSSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sR0FBRyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7UUFFdkgsMENBQTBDO1FBQzFDLDhHQUE4RztJQUNoSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9zcGVjL2ZldGNoLXJlbW90ZS1pbWFwU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcblxuaW1wb3J0ICogYXMgZmV0Y2hJbWFwIGZyb20gJy4uL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5qYXNtaW5lLkRFRkFVTFRfVElNRU9VVF9JTlRFUlZBTCA9IDUgKiA2MCAqIDEwMDA7XG5cbmRlc2NyaWJlKCdmZXRjaC1yZW1vdGUtaW1hcCcsICgpID0+IHtcblxuICB4aXQoJ2NhbiBzZW5kIG1haWwnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLnJldHJ5U2VuZE1haWwoXG4gICAgICAnSGVsbG93IHdvcmxkOiAnICsgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpLFxuICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJycsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpXG4gICAgKTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gcmVjaWV2ZSBtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGFwcE5hbWUgPSAnSGVsbG93IHdvcmxkJztcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBjb25zdCBmb3VuZElkeCA9IGF3YWl0IGNvbnRleHQuZmluZE1haWwoY29udGV4dC5sYXN0SW5kZXgsIGBidWlsZCBhcnRpZmFjdDogJHthcHBOYW1lfTpgKTtcbiAgICAgIGlmIChmb3VuZElkeCA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBtYWlsIGZvciBcIiR7YXBwTmFtZX1cImApO1xuICAgICAgY29uc3QgdGFyZ2V0TWFpbCA9IGF3YWl0IGNvbnRleHQud2FpdEZvckZldGNoKGZvdW5kSWR4LCBmYWxzZSk7XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRNYWlsKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gcmVjaWV2ZSBtYWlsIG9ubHkgd2l0aCB0ZXh0IGJvZHknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYXBwTmFtZSA9ICdIZWxsb3cgd29ybGQnO1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kSWR4ID0gYXdhaXQgY29udGV4dC5maW5kTWFpbChjb250ZXh0Lmxhc3RJbmRleCwgYGJ1aWxkIGFydGlmYWN0OiAke2FwcE5hbWV9OmApO1xuICAgICAgaWYgKGZvdW5kSWR4ID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIG1haWwgZm9yIFwiJHthcHBOYW1lfVwiYCk7XG4gICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgY29udGV4dC53YWl0Rm9yRmV0Y2hUZXh0KGZvdW5kSWR4KTtcbiAgICAgIGNvbnNvbGUubG9nKCcjIyMjIyN0ZXh0OiAlcyMjIyMjJywgdGV4dCk7XG4gICAgICBhd2FpdCBjb250ZXh0LndhaXRGb3JSZXBseShgRkVUQ0ggJHtmb3VuZElkeH0gQk9EWVsyXWApO1xuICAgICAgLy8gY29uc29sZS5sb2codGFyZ2V0TWFpbCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdjYW4gZmV0Y2ggY2hlY2tzdW0gYW5kIHppcHMgZnJvbSBtYWlsIHNlcnZlcicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICBjb25zb2xlLmxvZyhhd2FpdCBtZ3IuZmV0Y2hVcGRhdGVDaGVja1N1bSgndGVzdEFwcCcpKTtcbiAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS0tZmV0Y2hPdGhlclppcHMgc3RhcnRzIC0tLS0tLS0tLS0nKTtcbiAgICBhd2FpdCBtZ3IuZmV0Y2hPdGhlclppcHMoJ3Rlc3RBcHAnKTtcbiAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS1mZXRjaE90aGVyWmlwcyBlbmRzIC0tLS0tLS0tLS0tJyk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIHNlbmQgYnVpbGQgbWFpbCB3aXRoIHppcCBmaWxlJywgYXN5bmMgKCk9PiB7XG4gICAgbGV0IG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIGF3YWl0IG1nci5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bSgndGVzdEFwcDEnLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKSk7XG5cbiAgICAvLyBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICAvLyBhd2FpdCBtZ3Iuc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWF0dGFjaG1lbnQuemlwJykpO1xuICB9KTtcbn0pO1xuIl19
