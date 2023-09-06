import { RxController } from './control';
export class DuplexController {
    constructor(opts) {
        this.inputControl = this.i = new RxController(Object.assign(Object.assign({}, opts), { debug: (opts === null || opts === void 0 ? void 0 : opts.debug) ? (opts === null || opts === void 0 ? void 0 : opts.debug) + '.input' : false, log: opts === null || opts === void 0 ? void 0 : opts.log }));
        this.outputControl = this.o = new RxController(Object.assign(Object.assign({}, opts), { debug: (opts === null || opts === void 0 ? void 0 : opts.debug) ? (opts === null || opts === void 0 ? void 0 : opts.debug) + '.output' : false, log: opts === null || opts === void 0 ? void 0 : opts.log }));
    }
}
//# sourceMappingURL=duplex.js.map