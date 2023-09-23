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
// import inspector from 'node:inspector';
const rx = __importStar(require("rxjs"));
const duplex_1 = require("./duplex");
class ReactorComposite extends duplex_1.DuplexController {
    constructor(opts) {
        super(opts);
        this.opts = opts;
        this.error$ = new rx.ReplaySubject();
        this.destory$ = new rx.ReplaySubject(1);
        /** Abbrevation of addReaction */
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        this.reactorSubj = new rx.ReplaySubject();
        // this.logSubj = new rx.ReplaySubject(50);
    }
    startAll() {
        return rx.merge(this.reactorSubj.pipe(rx.mergeMap(([label, downStream, noError]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }))).pipe(rx.takeUntil(this.destory$), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
    }
    destory() {
        this.destory$.next();
    }
    // eslint-disable-next-line space-before-function-paren
    reactivize(fObject) {
        const funcs = Object.entries(fObject);
        for (const [key, func] of funcs) {
            if (typeof func === 'function') {
                this.reactivizeFunction(key, func, fObject);
            }
        }
        return this;
    }
    /**
     * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
     * which will be or has already been observed by `startAll()`.
     * This is where we can add `side effect`s
    * */
    addReaction(...params) {
        this.r(...params);
    }
    reactivizeFunction(key, func, funcThisRef) {
        const resolveFuncKey = key + 'Resolved';
        const finishFuncKey = key + 'Completed';
        const dispatchResolved = this.o.core.dispatchForFactory(resolveFuncKey);
        const dispatchCompleted = this.o.core.dispatchForFactory(finishFuncKey);
        this.r(this.i.pt[key].pipe(rx.mergeMap(([meta, ...params]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = func.apply(funcThisRef, params);
            if (rx.isObservable(res)) {
                return res.pipe(rx.map(res => dispatchResolved(meta, res)), rx.finalize(() => dispatchCompleted(meta)));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            }
            else if ((res === null || res === void 0 ? void 0 : res.then) != null && (res === null || res === void 0 ? void 0 : res.catch) != null) {
                return rx.defer(() => res).pipe(rx.map(res => dispatchResolved(meta, res)), rx.finalize(() => dispatchCompleted(meta)));
            }
            else {
                dispatchResolved(meta, res);
                dispatchCompleted(meta);
                return rx.EMPTY;
            }
        })));
        return resolveFuncKey;
    }
    handleError(upStream, label) {
        return upStream.pipe(rx.catchError((err, src) => {
            var _a;
            this.error$.next([err, label]);
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(label !== null && label !== void 0 ? label : '', err);
            return src;
        }));
    }
}
exports.ReactorComposite = ReactorComposite;
//# sourceMappingURL=epic.js.map