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
exports.waitForImport$ = void 0;
exports.createRtreeInstance = createRtreeInstance;
const rx = __importStar(require("rxjs"));
const MyRTreeConstructor$ = new rx.ReplaySubject(1);
const rtreeProm = import('rbush').then(({ default: RBush }) => {
    class RTreeCls extends RBush {
        constructor() {
            super(5);
        }
        toBBox([[x, y, w, h]]) {
            return {
                minX: x,
                minY: y,
                maxX: x + w,
                maxY: y + h
            };
        }
        compareMinX(a, b) {
            return a[0][0] - b[0][0];
        }
        compareMinY(a, b) {
            return a[0][1] - b[0][1];
        }
    }
    return RTreeCls;
});
rx.from(rtreeProm).subscribe(MyRTreeConstructor$);
/** If the calling module is CJS, the import will have to be async */
exports.waitForImport$ = MyRTreeConstructor$.pipe(rx.take(1));
/** For CJS file to load and create an "rbush"'s r-tree instance*/
function createRtreeInstance() {
    const store = new rx.ReplaySubject(1);
    MyRTreeConstructor$.pipe(rx.map(cls => new cls())).subscribe(store);
    return store;
}
//# sourceMappingURL=rbush.js.map