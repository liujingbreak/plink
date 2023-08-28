"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplexController = void 0;
const control_1 = require("./control");
class DuplexController {
    constructor(opts) {
        this.inputControl = this.i = new control_1.RxController({ debug: (opts === null || opts === void 0 ? void 0 : opts.debug) ? (opts === null || opts === void 0 ? void 0 : opts.debug) + '.input' : false, log: opts === null || opts === void 0 ? void 0 : opts.log });
        this.outputControl = this.o = new control_1.RxController({ debug: (opts === null || opts === void 0 ? void 0 : opts.debug) ? (opts === null || opts === void 0 ? void 0 : opts.debug) + '.output' : false, log: opts === null || opts === void 0 ? void 0 : opts.log });
    }
}
exports.DuplexController = DuplexController;
//# sourceMappingURL=duplex.js.map