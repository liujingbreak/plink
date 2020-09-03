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
    xit('can connect to server', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        fetchImap.connectImap(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            // await context.waitForReply('');
        }));
    }));
    xit('can send mail', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        yield fetchImap.retrySendMail('Hellow world: ' + new Date().toLocaleString(), path_1.default.resolve(__dirname, '', '../../ts/spec/fetch-remote-attachment.zip'));
    }));
    xit('can append mail by IMAP', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            yield context.appendMail('hellow world', 'test mail');
        }));
    }));
    it('can recieve mail', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
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
    xit('can recieve mail only with text body', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const appName = 'Hellow world';
        yield fetchImap.connectImap((context) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            const foundIdx = yield context.findMail(context.lastIndex, `build artifact:pre-build(test-${appName})`);
            if (foundIdx == null)
                throw new Error(`Can not find mail for "${appName}"`);
            const text = yield context.waitForFetchText(foundIdx);
            console.log('######text: %s#####', text);
            yield context.waitForReply(`FETCH ${foundIdx} BODY[2]`);
            // console.log(targetMail);
        }));
    }));
    xit('can fetch checksum and zips from mail server', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const mgr = new fetchImap.ImapManager('dev');
        console.log(yield mgr.fetchUpdateCheckSum('testApp'));
        // console.log('---------fetchOtherZips starts ----------');
        yield mgr.fetchOtherZips('testApp');
        // console.log('--------fetchOtherZips ends -----------');
    }));
    xit('can send build mail with zip file', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        // let mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum('testApp1', Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
        // mgr = new fetchImap.ImapManager('dev');
        // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
    }));
});

//# sourceMappingURL=fetch-remote-imapSpec.js.map
