"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBufferResponse = void 0;
const stream_1 = require("stream");
function createBufferResponse(originRes, onFinish) {
    const bufs = [];
    const bufStream = new stream_1.Writable({
        write(chunk, encoding, cb) {
            bufs.push(chunk);
            cb();
        },
        final(cb) {
            if (bufs.length > 0) {
                let data = Buffer.isBuffer(bufs[0]) ? Buffer.concat(bufs) :
                    typeof bufs[0] === 'string' ? bufs.join('') : bufs;
                if (Array.isArray(data) && data.length === 1) {
                    data = data[0];
                }
                onFinish(data, () => {
                    origEnd(data);
                });
            }
        }
    });
    // const origWrite = originRes.write;
    const origEnd = originRes.end.bind(originRes);
    const origOn = originRes.on;
    const origOnce = originRes.once;
    const origOff = originRes.off;
    originRes.write = function (...args) {
        return bufStream.write.apply(bufStream, args);
    };
    originRes.end = function (...args) {
        return bufStream.end.apply(bufStream, args);
    };
    originRes.on = function (evt, ...args) {
        if (evt === 'drain' || evt === 'finish') {
            return bufStream.on.call(bufStream, evt, ...args);
        }
        else {
            return origOn.call(bufStream, evt, ...args);
        }
    };
    originRes.once = function (evt, ...args) {
        if (evt === 'drain' || evt === 'finish') {
            return bufStream.once.call(bufStream, evt, ...args);
        }
        else {
            return origOnce.call(bufStream, evt, ...args);
        }
    };
    originRes.once = function (evt, ...args) {
        if (evt === 'drain' || evt === 'finish') {
            return bufStream.off.call(bufStream, evt, ...args);
        }
        else {
            return origOff.call(bufStream, evt, ...args);
        }
    };
    return originRes;
}
exports.createBufferResponse = createBufferResponse;
//# sourceMappingURL=utils.js.map