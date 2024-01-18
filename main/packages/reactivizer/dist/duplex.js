"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplexController = void 0;
const control_1 = require("./control");
let SEQ = new Date().getUTCMilliseconds();
class DuplexController {
    constructor(opts) {
        var _a;
        this.id = SEQ++;
        const name = (_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '';
        this.inputControl = this.i = new control_1.RxController(Object.assign(Object.assign({}, opts), { debug: opts === null || opts === void 0 ? void 0 : opts.debug, name: name + `#${this.id}.i `, log: opts === null || opts === void 0 ? void 0 : opts.log }));
        this.outputControl = this.o = new control_1.RxController(Object.assign(Object.assign({}, opts), { debug: opts === null || opts === void 0 ? void 0 : opts.debug, name: name + `#${this.id}.o `, log: opts === null || opts === void 0 ? void 0 : opts.log }));
    }
    /** Invoke `setName` on RxController */
    setName(value) {
        this.i.setName(value + `#${this.id}.i `);
        this.o.setName(value + `#${this.id}.o `);
    }
}
exports.DuplexController = DuplexController;
//# sourceMappingURL=duplex.js.map