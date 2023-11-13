"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultComparator = void 0;
const epic_1 = require("../epic");
class DefaultComparator {
    constructor() {
        this.compositeCtrl = new epic_1.ReactorComposite();
        this.input = this.compositeCtrl.i;
        this.output = this.compositeCtrl.o;
        // this.compositeCtrl.startAll();
    }
    compare(a, b) {
        return a - b;
    }
    createTypedArray(buf, offset, len) {
        return offset != null && len != null ?
            new Uint32Array(buf, offset * Uint32Array.BYTES_PER_ELEMENT, len) :
            new Uint32Array(buf);
    }
    createArrayBufferOfSize(num) {
        return new ArrayBuffer(num * Uint32Array.BYTES_PER_ELEMENT);
    }
}
exports.DefaultComparator = DefaultComparator;
// export const defaultComparator = new DefaultComparator();
//# sourceMappingURL=sort-comparator-interf.js.map