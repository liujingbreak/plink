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
exports.rectUnion = rectUnion;
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
        searchOverlaps([x, y, w, h]) {
            return this.search({
                minX: x,
                minY: y,
                maxX: x + w,
                maxY: y + h
            });
        }
        addOrUnionRectOnOverlap(rect, content, merge) {
            const [x, y, w, h] = rect;
            const results = this.search({ minX: x, minY: y, maxX: x + w, maxY: y + h });
            for (const [intersect, c] of results) {
                this.remove([intersect, null], isEqualRect);
                rect = rectUnion(intersect, rect);
                this.insert([
                    rect,
                    merge(content, c)
                ]);
            }
            return results;
        }
        updateContent(r, content) {
            this.remove([r, null], isEqualRect);
            this.insert([r, content]);
        }
        searchForCovered(r) {
            return this.searchOverlaps(r).filter(([[x, y, w, h]]) => r[0] <= x && r[1] <= y && r[0] + r[2] >= x + w && r[1] + r[3] >= y + h);
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
function rectUnion([x1, y1, w1, h1], [x2, y2, w2, h2]) {
    const x = x1 < x2 ? x1 : x2;
    const y = y1 < y2 ? y1 : y2;
    const r1 = x1 + w1;
    const r2 = x2 + w2;
    const w = r1 > r2 ? r1 - x : r2 - x;
    const b1 = y1 + h1;
    const b2 = y2 + h2;
    const h = b1 > b2 ? b1 - y : b2 - y;
    return [x, y, w, h];
}
function isEqualRect([a], [b]) {
    return a.every((el, i) => el === b[i]);
}
//# sourceMappingURL=rbush.js.map