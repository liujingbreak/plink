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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForkedRxController = void 0;
exports.isForked = isForked;
const rx = __importStar(require("rxjs"));
const control2_1 = require("./control2");
/**
 * Use a forked RxController to extend functionality of existing reactors of another RxController or ForkedRxController.
 *
 * A forkes controller shares same message dispatch stream (actionUpstream) from the source controller's
 * So that messages dispatched from both controller can be recieved by both controller's `action$`
 * subscription stream.
 *
 * A message interceptor of source RxController can impact all forked controller.
 */
class ForkedRxController extends control2_1.RxController2 {
    constructor(src) {
        super();
        this.src = src;
        this.config(Object.assign(Object.assign({}, src.opts), { debug: false }));
        src.configChange.pipe(rx.map(c => {
            c.delete('debug');
            return c;
        })).subscribe(this.configChange);
        this.forkedUpStream = this.actionUpstream;
        this.actionUpstream = src.actionUpstream;
        src.appendInterceptor(a$ => {
            return a$.pipe(rx.map(a => {
                // Ensure forked one recieve earlier than current controller
                this.forkedUpStream.next(a);
                // Ensure action emitted later than prependController
                return a;
            }));
        });
    }
    /* @override */
    prependInterceptor(...interceptor) {
        this.src.prependInterceptor(...interceptor);
    }
    /** append interceptor to all source controllers */
    appendInterceptorToSrc(...interceptors) {
        if (isForked(this.src))
            this.src.appendInterceptorToSrc(...interceptors);
        this.src.appendInterceptor(...interceptors);
    }
}
exports.ForkedRxController = ForkedRxController;
function isForked(t) {
    return t.appendInterceptorToSrc != null;
}
//# sourceMappingURL=forked-control.js.map