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
exports.SingleActionInterceptor = void 0;
const rx = __importStar(require("rxjs"));
const context_operators_1 = require("./context-operators");
const utils_1 = require("./utils");
// eslint-disable-next-line @typescript-eslint/no-empty-function
const EMPTY_FN = () => { };
class SingleActionInterceptor {
    constructor(s, meta) {
        this.s = s;
        this.meta = meta;
        if (s.interceptSrcAction) {
            this.forkStream = s;
            this.emitAction = this.forkStream.interceptSrcAction(meta);
        }
        else {
            this.emitAction = EMPTY_FN;
        }
    }
    changePayload(...overridePayload) {
        this.payload = overridePayload;
        return this;
    }
    dp() {
        var _a;
        this.emitAction(...(_a = this.payload) !== null && _a !== void 0 ? _a : []);
    }
    /** observe messages related to interecpted action and
    * dipatch intercepted action back to base stream
    **/
    od(...moreMessages) {
        return (0, utils_1.onAllSubscribed)(moreMessages.map(r => this.s.doOperator$.pipe(rx.switchMap(operator => r.pipe(operator(this.meta), (0, context_operators_1.actionRelatedToAction)(this.meta))))), () => {
            var _a;
            this.emitAction(...(_a = this.payload) !== null && _a !== void 0 ? _a : []);
        });
    }
}
exports.SingleActionInterceptor = SingleActionInterceptor;
//# sourceMappingURL=single-action-interceptor.js.map