import { RxController } from './control';
export class DuplexController {
    constructor(opts) {
        this.inputControl = this.i = new RxController({ debug: (opts === null || opts === void 0 ? void 0 : opts.debug) + '.in', log: opts === null || opts === void 0 ? void 0 : opts.log });
        this.outputControl = this.o = new RxController({ debug: (opts === null || opts === void 0 ? void 0 : opts.debug) + '.out', log: opts === null || opts === void 0 ? void 0 : opts.log });
    }
}
//# sourceMappingURL=duplex.js.map