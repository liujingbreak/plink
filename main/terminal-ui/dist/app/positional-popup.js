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
exports.positionalFac = void 0;
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const container_1 = require("../core/container");
const tableFor = ['setAbsPos', 'isDocked'];
exports.positionalFac = container_1.baseContainerFac.forExtend({
    name: 'positional',
    tableFor
}).defineReactor((init, content, opts) => {
    const { ft, r, pt, table } = init(opts);
    r('reflow -> c.onSize,onChildPositions', pt.reflow.pipe(rx.withLatestFrom(table.l.allDisplayChildren, table.l.isDocked, table.l.onSize), rx.switchMap(([[m], [, children], [, isDocked], [, width, height]]) => {
        if (children.length === 0)
            return rx.EMPTY;
        if (isDocked) {
            const [x, y, w, h] = isDocked;
            const hor = x > width - x - w ? 'Left' : 'Right';
            const ver = y > height - y - h ? 'up' : 'down';
            ft.onDockType(`${ver}${hor}`).dp(m);
            const maxWidth = hor === 'Left' ? x + w : width - x;
            const maxHeight = ver === 'up' ? y : height - y - h;
            return rx.concat(children[0].table.l.preferredSize.pipe(rx.mergeMap(([, pw, ph]) => {
                if (pw <= maxWidth && ph <= maxHeight) {
                    children[0].ft.onSize(pw, ph).dp(m);
                    return rx.EMPTY;
                }
                else if (pw > maxWidth && ph > maxHeight) {
                    children[0].ft.onSize(maxWidth, maxHeight).dp(m);
                    return rx.EMPTY;
                }
                else if (pw > maxWidth) {
                    return children[0].ft.querySizeOf(maxWidth, null).re(m).od(children[0].pt.prefHeightFor);
                }
                else if (ph > maxHeight) {
                    return children[0].ft.querySizeOf(null, maxHeight).re(m).od(children[0].pt.prefWidthFor);
                }
                return rx.EMPTY;
            }), rx.take(1), rx.map(([, cw, ch]) => {
                children[0].ft.onSize(cw > maxWidth ? maxWidth : cw, ch > maxHeight ? maxHeight : ch).dp(m);
            })), rx.defer(() => children[0].table.l.onSize).pipe(rx.map(([, cWidth, cHeight]) => {
                const posX = hor === 'Left' ? x + w - cWidth : x;
                const posY = ver === 'up' ? y - cHeight : y + h;
                ft.onChildPositions(new Map([[children[0], [posX, posY]]])).dp(m);
            }), rx.take(1)));
        }
        else {
            return table.l.setAbsPos.pipe(
            // TODO
            // rx.map(([, x, y]) => []),
            rx.take(1));
        }
        return rx.EMPTY;
    })));
    r('setAbsPos -> isDocked', pt.setAbsPos.pipe(rx.map(([m]) => {
        ft.isDocked(false).dp(m);
    })));
    r('dockTo... -> isDocked', pt.dockTo.pipe(rx.switchMap(([m, c]) => c.ft.queryAbsBounding().re(m).od(c.pt.didQueryAbsBounding).pipe(rx.map(([m2, r]) => {
        if (r)
            ft.isDocked(r).dp(m, m2);
    })))));
    ft.addChild(content).dp();
    ft.addReflowAction(pt.isDocked).dp();
});
//# sourceMappingURL=positional-popup.js.map