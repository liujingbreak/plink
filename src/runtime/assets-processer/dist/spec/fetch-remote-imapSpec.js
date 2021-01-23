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
// tslint:disable no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLWltYXBTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmV0Y2gtcmVtb3RlLWltYXBTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qjs7R0FFRztBQUNILGdFQUFrRDtBQUNsRCxnREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRWpFLE9BQU8sQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUVqRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRWpDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFTLEVBQUU7UUFDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFTLEVBQUU7WUFDL0Isa0NBQWtDO1FBQ3BDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFTLEVBQUU7UUFDOUIsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUMzQixnQkFBZ0IsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUM5QyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsQ0FDekUsQ0FBQztJQUNKLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMseUJBQXlCLEVBQUUsR0FBUyxFQUFFO1FBQ3hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0JBQWtCLEVBQUUsR0FBUyxFQUFFO1FBQ2hDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7WUFDdkcsSUFBSSxRQUFRLElBQUksSUFBSTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUMsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3JELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUN4RyxJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsUUFBUSxVQUFVLENBQUMsQ0FBQztZQUN4RCwyQkFBMkI7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsOENBQThDLEVBQUUsR0FBUyxFQUFFO1FBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsNERBQTREO1FBQzVELE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQywwREFBMEQ7SUFDNUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFRLEVBQUU7UUFDakQsOENBQThDO1FBQzlDLDBIQUEwSDtRQUUxSCwwQ0FBMEM7UUFDMUMsOEdBQThHO0lBQ2hILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbi8qKlxuICogZHJjcCB0ZXN0IC1mIC4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9zcGVjL2ZldGNoLXJlbW90ZS1pbWFwU3BlYy50cyAtYyBkaXN0L2NvbmZpZy5sb2NhbC55YW1sIGNvbmYvcmVtb3RlLWRlcGxveS10ZXN0LnlhbWxcbiAqL1xuaW1wb3J0ICogYXMgZmV0Y2hJbWFwIGZyb20gJy4uL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdmZXRjaC1yZW1vdGUtaW1hcFNwZWMnKTtcblxuamFzbWluZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSA1ICogNjAgKiAxMDAwO1xuXG5kZXNjcmliZSgnZmV0Y2gtcmVtb3RlLWltYXAnLCAoKSA9PiB7XG5cbiAgeGl0KCdjYW4gY29ubmVjdCB0byBzZXJ2ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jICgpID0+IHtcbiAgICAgIC8vIGF3YWl0IGNvbnRleHQud2FpdEZvclJlcGx5KCcnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gc2VuZCBtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGZldGNoSW1hcC5yZXRyeVNlbmRNYWlsKFxuICAgICAgJ0hlbGxvdyB3b3JsZDogJyArIG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcnLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKVxuICAgICk7XG4gIH0pO1xuXG4gIHhpdCgnY2FuIGFwcGVuZCBtYWlsIGJ5IElNQVAnLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jIGNvbnRleHQgPT4ge1xuICAgICAgYXdhaXQgY29udGV4dC5hcHBlbmRNYWlsKCdoZWxsb3cgd29ybGQnLCAndGVzdCBtYWlsJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdjYW4gcmVjaWV2ZSBtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGZldGNoSW1hcC5jb25uZWN0SW1hcChhc3luYyBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kSWR4ID0gYXdhaXQgY29udGV4dC5maW5kTWFpbChjb250ZXh0Lmxhc3RJbmRleCwgJ2J1aWxkIGFydGlmYWN0OnByZS1idWlsZChwcm9kLWFkbWluLWJjbCknKTtcbiAgICAgIGlmIChmb3VuZElkeCA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCB0aGUgbWFpbCcpO1xuICAgICAgbG9nLmluZm8oJy0tLSBmaW5kIG1haWwgaW5kZXggLS0tJywgZm91bmRJZHgpO1xuICAgICAgLy8gY29uc3QgZm91bmRJZHggPSA4O1xuICAgICAgY29uc3QgdGFyZ2V0TWFpbCA9IGF3YWl0IGNvbnRleHQud2FpdEZvckZldGNoKGZvdW5kSWR4LCBmYWxzZSk7XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRNYWlsKTtcbiAgICAgIGxvZy5pbmZvKCdjYW4gcmVjaWV2ZSBtYWlsIC0gZG9uZScpO1xuICAgIH0pO1xuICB9KTtcblxuICB4aXQoJ2NhbiByZWNpZXZlIG1haWwgb25seSB3aXRoIHRleHQgYm9keScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBhcHBOYW1lID0gJ0hlbGxvdyB3b3JsZCc7XG4gICAgYXdhaXQgZmV0Y2hJbWFwLmNvbm5lY3RJbWFwKGFzeW5jIGNvbnRleHQgPT4ge1xuICAgICAgY29uc3QgZm91bmRJZHggPSBhd2FpdCBjb250ZXh0LmZpbmRNYWlsKGNvbnRleHQubGFzdEluZGV4LCBgYnVpbGQgYXJ0aWZhY3Q6cHJlLWJ1aWxkKHRlc3QtJHthcHBOYW1lfSlgKTtcbiAgICAgIGlmIChmb3VuZElkeCA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBtYWlsIGZvciBcIiR7YXBwTmFtZX1cImApO1xuICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGNvbnRleHQud2FpdEZvckZldGNoVGV4dChmb3VuZElkeCk7XG4gICAgICBjb25zb2xlLmxvZygnIyMjIyMjdGV4dDogJXMjIyMjIycsIHRleHQpO1xuICAgICAgYXdhaXQgY29udGV4dC53YWl0Rm9yUmVwbHkoYEZFVENIICR7Zm91bmRJZHh9IEJPRFlbMl1gKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRhcmdldE1haWwpO1xuICAgIH0pO1xuICB9KTtcblxuICB4aXQoJ2NhbiBmZXRjaCBjaGVja3N1bSBhbmQgemlwcyBmcm9tIG1haWwgc2VydmVyJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIGNvbnNvbGUubG9nKGF3YWl0IG1nci5mZXRjaFVwZGF0ZUNoZWNrU3VtKCd0ZXN0QXBwJykpO1xuICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0tLS1mZXRjaE90aGVyWmlwcyBzdGFydHMgLS0tLS0tLS0tLScpO1xuICAgIGF3YWl0IG1nci5mZXRjaE90aGVyWmlwcygndGVzdEFwcCcpO1xuICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0tLWZldGNoT3RoZXJaaXBzIGVuZHMgLS0tLS0tLS0tLS0nKTtcbiAgfSk7XG5cbiAgeGl0KCdjYW4gc2VuZCBidWlsZCBtYWlsIHdpdGggemlwIGZpbGUnLCBhc3luYyAoKT0+IHtcbiAgICAvLyBsZXQgbWdyID0gbmV3IGZldGNoSW1hcC5JbWFwTWFuYWdlcignZGV2Jyk7XG4gICAgLy8gYXdhaXQgbWdyLnNlbmRGaWxlQW5kVXBkYXRlZENoZWNrc3VtKCd0ZXN0QXBwMScsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2ZldGNoLXJlbW90ZS1hdHRhY2htZW50LnppcCcpKTtcblxuICAgIC8vIG1nciA9IG5ldyBmZXRjaEltYXAuSW1hcE1hbmFnZXIoJ2RldicpO1xuICAgIC8vIGF3YWl0IG1nci5zZW5kRmlsZUFuZFVwZGF0ZWRDaGVja3N1bShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9mZXRjaC1yZW1vdGUtYXR0YWNobWVudC56aXAnKSk7XG4gIH0pO1xufSk7XG4iXX0=