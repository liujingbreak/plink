"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const stream = tslib_1.__importStar(require("stream"));
const utils_1 = require("../utils");
function test() {
    let readStarts = false;
    const input = new stream.Readable({
        read(_size) {
            if (readStarts) {
                return;
            }
            readStarts = true;
            for (let i = 0; i < 10; i++) {
                setTimeout(() => this.push(i + ', '), 0);
            }
            setTimeout(() => {
                this.push('over');
                this.push(null);
            }, 50);
        }
    });
    const fac = (0, utils_1.createReplayReadableFactory)(input);
    function readOnce() {
        let sentance = '';
        stream.pipeline(fac(), new stream.Writable({
            write(str, _enc, cb) {
                cb();
                sentance += str;
            },
            final(cb) {
                cb();
                console.log(sentance);
            }
        }), () => { });
    }
    readOnce();
    readOnce();
    setTimeout(readOnce, 0);
}
exports.test = test;
// import {testable} from '../utils';
// describe('Utils', () => {
//   test('keyOfUri', () => {
//     console.log('here');
//     const key = testable.keyOfUri('GET', '/foobar/it');
//     expect(key).toBe('GET/foobar/it');
//   });
// });
//# sourceMappingURL=utils.test.js.map