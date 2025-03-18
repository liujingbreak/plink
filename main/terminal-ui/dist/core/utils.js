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
exports.materialColorUtil$ = void 0;
exports.findLowestCommonAncestor = findLowestCommonAncestor;
exports.hexColorFrom = hexColorFrom;
exports.hctColorFromHex = hctColorFromHex;
const rx = __importStar(require("rxjs"));
function findLowestCommonAncestor(...comps) {
    if (comps.length === 1)
        return comps[0];
    else if (comps.length === 0)
        throw new Error('Empty parameters');
    else if (comps.length > 2) {
        const a = findLowestCommonAncestor(comps[0], comps[1]);
        if (a == null)
            return null;
        const b = findLowestCommonAncestor(a, ...comps.slice(2));
        return b;
    }
    else {
        // comps.length === 2
        let [a, deeper] = comps;
        if (a.table.getData().depth[0] > deeper.table.getData().depth[0]) {
            const temp = a;
            a = deeper;
            deeper = temp;
        }
        let depth = deeper.table.getData().depth[0];
        const aDepth = a.table.getData().depth[0];
        while (depth > 0 && depth > aDepth) {
            deeper = deeper.table.getData().setParent[0];
            depth--;
        }
        // same depth
        let pa = a;
        let pb = deeper;
        while (pa != null && pb != null && pa !== pb) {
            pa = pa.table.getData().setParent[0];
            pb = pb.table.getData().setParent[0];
        }
        if (pa === pb) {
            return pa;
        }
        return null;
    }
}
exports.materialColorUtil$ = new rx.ReplaySubject(1);
rx.from(import('@material/material-color-utilities')).subscribe(exports.materialColorUtil$);
/**
 * @param hue 0 - 360
 * @param chroma 0 - round 120
 * @param tone 0 - 100
 */
function hexColorFrom(hue, chroma, tone) {
    return exports.materialColorUtil$.pipe(rx.map(({ Hct, hexFromArgb }) => {
        const color = Hct.from(hue, chroma, tone);
        return hexFromArgb(color.toInt());
    }));
}
/**
 * @param hex String representing color as hex code. Accepts strings with or
 *     without leading #, and string representing the color using 3, 6, or 8
 *     hex characters
 */
function hctColorFromHex(hex) {
    return exports.materialColorUtil$.pipe(rx.map(({ Hct, argbFromHex }) => {
        const argb = argbFromHex(hex);
        const color = Hct.fromInt(argb);
        return color;
    }));
}
//# sourceMappingURL=utils.js.map