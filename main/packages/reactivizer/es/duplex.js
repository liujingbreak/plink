import { RxController } from './control';
export class DuplexController {
    constructor(opts) {
        var _a;
        const name = (_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '';
        this.inputControl = this.i = new RxController(Object.assign(Object.assign({}, opts), { debug: opts === null || opts === void 0 ? void 0 : opts.debug, name: name + '.input', log: opts === null || opts === void 0 ? void 0 : opts.log }));
        this.outputControl = this.o = new RxController(Object.assign(Object.assign({}, opts), { debug: opts === null || opts === void 0 ? void 0 : opts.debug, name: name + '.output', log: opts === null || opts === void 0 ? void 0 : opts.log }));
    }
    /** Invoke `setName` on RxController */
    setName(value) {
        this.i.setName(value + '.input');
        this.o.setName(value + '.output');
    }
}
//# sourceMappingURL=duplex.js.map