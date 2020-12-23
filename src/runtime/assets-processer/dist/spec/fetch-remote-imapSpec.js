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

//# sourceMappingURL=fetch-remote-imapSpec.js.map
