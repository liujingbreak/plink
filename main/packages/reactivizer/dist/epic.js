"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactorComposite = void 0;
const rx = __importStar(require("rxjs"));
const duplex_1 = require("./duplex");
class ReactorComposite {
    constructor(opts) {
        this.opts = opts;
        this.control = new duplex_1.DuplexController(opts);
        this.l = this.latestPayloads = this.control.i.createLatestPayloadsFor('mergeStream');
    }
    startAll() {
        return rx.merge(this.l.mergeStream.pipe(rx.mergeMap(([_id, downStream, noError, label]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }))).pipe(rx.takeUntil(this.control.i.pt.stopAll), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
    }
    getControl() {
        return this.control;
    }
    handleError(upStream, label) {
        return upStream.pipe(rx.catchError((err, src) => {
            this.control.o.dispatcher.onError(err, label);
            return src;
        }));
    }
}
exports.ReactorComposite = ReactorComposite;
//# sourceMappingURL=epic.js.map