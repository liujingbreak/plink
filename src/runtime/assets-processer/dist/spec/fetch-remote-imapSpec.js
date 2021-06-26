"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
// eslint-disable  no-console
/**
 * drcp test -f ../web-fun-house/src/runtime/assets-processer/ts/spec/fetch-remote-imapSpec.ts -c dist/config.local.yaml conf/remote-deploy-test.yaml
 */
const fetchImap = __importStar(require("../fetch-remote-imap"));
const path_1 = __importDefault(require("path"));
const log = require('log4js').getLogger('fetch-remote-imapSpec');
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('fetch-remote-imap', () => {
    xit('can connect to server', () => __awaiter(void 0, void 0, void 0, function* () {
        fetchImap.connectImap(() => __awaiter(void 0, void 0, void 0, function* () {
            // await context.waitForReply('');
        }));
    }));
    xit('can send mail', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fetchImap.retrySendMail('Hellow world: ' + new Date().toLocaleString(), path_1.default.resolve(__dirname, '', '../../ts/spec/fetch-remote-attachment.zip'));
    }));
    xit('can append mail by IMAP', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fetchImap.connectImap((context) => __awaiter(void 0, void 0, void 0, function* () {
            yield context.appendMail('hellow world', 'test mail');
        }));
    }));
    it('can recieve mail', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fetchImap.connectImap((context) => __awaiter(void 0, void 0, void 0, function* () {
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
    xit('can recieve mail only with text body', () => __awaiter(void 0, void 0, void 0, function* () {
        const appName = 'Hellow world';
        yield fetchImap.connectImap((context) => __awaiter(void 0, void 0, void 0, function* () {
            const foundIdx = yield context.findMail(context.lastIndex, `build artifact:pre-build(test-${appName})`);
            if (foundIdx == null)
                throw new Error(`Can not find mail for "${appName}"`);
            const text = yield context.waitForFetchText(foundIdx);
            console.log('######text: %s#####', text);
            yield context.waitForReply(`FETCH ${foundIdx} BODY[2]`);
            // console.log(targetMail);
        }));
    }));
    xit('can fetch checksum and zips from mail server', () => __awaiter(void 0, void 0, void 0, function* () {
        const mgr = new fetchImap.ImapManager('dev');
        console.log(yield mgr.fetchUpdateCheckSum('testApp'));
        // console.log('---------fetchOtherZips starts ----------');
        yield mgr.fetchOtherZips('testApp');
        // console.log('--------fetchOtherZips ends -----------');
    }));
    xit('can send build mail with zip file', () => __awaiter(void 0, void 0, void 0, function* () {
        // let mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum('testApp1', Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
        // mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXBTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qjs7R0FFRztBQUNILGdFQUFrRDtBQUNsRCxnREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRWpFLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRWpDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFTLEVBQUU7UUFDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFTLEVBQUU7WUFDL0Isa0NBQWtDO1FBQ3BDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFTLEVBQUU7UUFDOUIsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUMzQixnQkFBZ0IsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUM5QyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsQ0FDekUsQ0FBQztJQUNKLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMseUJBQXlCLEVBQUUsR0FBUyxFQUFFO1FBQ3hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0JBQWtCLEVBQUUsR0FBUyxFQUFFO1FBQ2hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7WUFDdkcsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUMsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3JELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUN4RyxJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsUUFBUSxVQUFVLENBQUMsQ0FBQztZQUN4RCwyQkFBMkI7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsOENBQThDLEVBQUUsR0FBUyxFQUFFO1FBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsNERBQTREO1FBQzVELE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQywwREFBMEQ7SUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFRLEVBQUU7UUFDakQsOENBQThDO1FBQzlDLDBIQUEwSDtRQUUxSCwwQ0FBMEM7UUFDMUMsOEdBQThHO0lBQ2hILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlXG4vKipcbiAqIGRyY3AgdGVzdCAtZiAuLi93ZWItZnVuLWhvdXNlL3NyYy9ydW50aW1lL2Fzc2V0cy1wcm9jZXNzZXIvdHMvc3BlYy9mZXRjaC1yZW1vdGUtaW1hcFNwZWMudHMgLWMgZGlzdC9jb25maWcubG9jYWwueWFtbCBjb25mL3JlbW90ZS1kZXBsb3ktdGVzdC55YW1sXG4gKi9cbmltcG9ydCAqIGFzIGZldGNoSW1hcCBmcm9tICcuLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignZmV0Y2gtcmVtb3RlLWltYXBTcGVjJyk7XG5cbmphc21pbmUuREVGQVVMVF9USU1FT1VUX0lOVEVSVkFMID0gNSAqIDYwICogMTAwMDtcblxuZGVzY3JpYmUoJ2ZldGNoLXJlbW90ZS1pbWFwJywgKCkgPT4ge1xuXG4gIHhpdCgnY2FuIGNvbm5lY3QgdG8gc2VydmVyJywgYXN5bmMgKCkgPT4ge1xuICAgIGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyAoKSA9PiB7XG4gICAgICAvLyBhd2FpdCBjb250ZXh0LndhaXRGb3JSZXBseSgnJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIHNlbmQgbWFpbCcsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBmZXRjaEltYXAucmV0cnlTZW5kTWFpbChcbiAgICAgICdIZWxsb3cgd29ybGQ6ICcgKyBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnJywgJy4uLy4uL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWF0dGFjaG1lbnQuemlwJylcbiAgICApO1xuICB9KTtcblxuICB4aXQoJ2NhbiBhcHBlbmQgbWFpbCBieSBJTUFQJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGF3YWl0IGNvbnRleHQuYXBwZW5kTWFpbCgnaGVsbG93IHdvcmxkJywgJ3Rlc3QgbWFpbCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBpdCgnY2FuIHJlY2lldmUgbWFpbCcsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBmZXRjaEltYXAuY29ubmVjdEltYXAoYXN5bmMgY29udGV4dCA9PiB7XG4gICAgICBjb25zdCBmb3VuZElkeCA9IGF3YWl0IGNvbnRleHQuZmluZE1haWwoY29udGV4dC5sYXN0SW5kZXgsICdidWlsZCBhcnRpZmFjdDpwcmUtYnVpbGQocHJvZC1hZG1pbi1iY2wpJyk7XG4gICAgICBpZiAoZm91bmRJZHggPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgdGhlIG1haWwnKTtcbiAgICAgIGxvZy5pbmZvKCctLS0gZmluZCBtYWlsIGluZGV4IC0tLScsIGZvdW5kSWR4KTtcbiAgICAgIC8vIGNvbnN0IGZvdW5kSWR4ID0gODtcbiAgICAgIGNvbnN0IHRhcmdldE1haWwgPSBhd2FpdCBjb250ZXh0LndhaXRGb3JGZXRjaChmb3VuZElkeCwgZmFsc2UpO1xuICAgICAgY29uc29sZS5sb2codGFyZ2V0TWFpbCk7XG4gICAgICBsb2cuaW5mbygnY2FuIHJlY2lldmUgbWFpbCAtIGRvbmUnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gcmVjaWV2ZSBtYWlsIG9ubHkgd2l0aCB0ZXh0IGJvZHknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYXBwTmFtZSA9ICdIZWxsb3cgd29ybGQnO1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kSWR4ID0gYXdhaXQgY29udGV4dC5maW5kTWFpbChjb250ZXh0Lmxhc3RJbmRleCwgYGJ1aWxkIGFydGlmYWN0OnByZS1idWlsZCh0ZXN0LSR7YXBwTmFtZX0pYCk7XG4gICAgICBpZiAoZm91bmRJZHggPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgbWFpbCBmb3IgXCIke2FwcE5hbWV9XCJgKTtcbiAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBjb250ZXh0LndhaXRGb3JGZXRjaFRleHQoZm91bmRJZHgpO1xuICAgICAgY29uc29sZS5sb2coJyMjIyMjI3RleHQ6ICVzIyMjIyMnLCB0ZXh0KTtcbiAgICAgIGF3YWl0IGNvbnRleHQud2FpdEZvclJlcGx5KGBGRVRDSCAke2ZvdW5kSWR4fSBCT0RZWzJdYCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0YXJnZXRNYWlsKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gZmV0Y2ggY2hlY2tzdW0gYW5kIHppcHMgZnJvbSBtYWlsIHNlcnZlcicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICBjb25zb2xlLmxvZyhhd2FpdCBtZ3IuZmV0Y2hVcGRhdGVDaGVja1N1bSgndGVzdEFwcCcpKTtcbiAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS0tZmV0Y2hPdGhlclppcHMgc3RhcnRzIC0tLS0tLS0tLS0nKTtcbiAgICBhd2FpdCBtZ3IuZmV0Y2hPdGhlclppcHMoJ3Rlc3RBcHAnKTtcbiAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS1mZXRjaE90aGVyWmlwcyBlbmRzIC0tLS0tLS0tLS0tJyk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIHNlbmQgYnVpbGQgbWFpbCB3aXRoIHppcCBmaWxlJywgYXN5bmMgKCk9PiB7XG4gICAgLy8gbGV0IG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIC8vIGF3YWl0IG1nci5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bSgndGVzdEFwcDEnLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKSk7XG5cbiAgICAvLyBtZ3IgPSBuZXcgZmV0Y2hJbWFwLkltYXBNYW5hZ2VyKCdkZXYnKTtcbiAgICAvLyBhd2FpdCBtZ3Iuc2VuZEZpbGVBbmRVcGRhdGVkQ2hlY2tzdW0oUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvZmV0Y2gtcmVtb3RlLWF0dGFjaG1lbnQuemlwJykpO1xuICB9KTtcbn0pO1xuIl19