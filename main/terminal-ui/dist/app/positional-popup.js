/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import { DisplayMode } from '../core/base.js';
import { textFac } from '../hoc/text.js';
import { baseContainerFac } from '../core/container.js';
import { queryElevatorContainer } from '../core/elevator-container.js';
import { queryAppContext } from './app-shell.js';
import { querySchemeForComponent } from './color-theme.js';
const tableFor = ['setRelativePos', 'isDocked'];
export const positionalFac = baseContainerFac.forExtend({
    name: 'positional',
    tableFor
}).defineReactor((init, content, opts) => {
    const service = init(opts);
    const { ft, r, pt, table } = service;
    r('reflow -> c.onSize,onChildPositions', pt.reflow.pipe(rx.withLatestFrom(table.l.allDisplayChildren, table.l.isDocked, table.l.setRelativePos, table.l.onSize, table.l.onChildPositions), rx.switchMap(([[m], [, children], [, isDocked], [, relX, relY], [, width, height], [, childPos]]) => {
        if (children.length === 0)
            return rx.EMPTY;
        service.log('--relow: isDocked', isDocked);
        if (isDocked) {
            let [x, y] = isDocked;
            const [, , w, h] = isDocked;
            x += relX;
            y += relY;
            const hor = x > width - x - w ? 'Left' : 'Right';
            const ver = y > height - y - h ? 'up' : 'down';
            ft.onDockType(`${ver}${hor}`).dp(m);
            const maxWidth = hor === 'Left' ? x + w : width - x;
            const maxHeight = ver === 'up' ? y : height - y - h;
            return rx.concat(children[0].table.l.preferredSize.pipe(rx.mergeMap(([, pw, ph]) => {
                // service.log('--relow: child preferredSize', pw, ph, 'max size', maxWidth, maxHeight);
                if (pw <= maxWidth && ph <= maxHeight) {
                    return rx.of([null, pw, ph]);
                }
                else if (pw > maxWidth && ph > maxHeight) {
                    return rx.of([null, maxWidth, maxHeight]);
                }
                else if (pw > maxWidth) {
                    return children[0].ft.querySizeOf(maxWidth, null).re(m).od(children[0].pt.prefHeightFor);
                }
                else if (ph > maxHeight) {
                    return children[0].ft.querySizeOf(null, maxHeight).re(m).od(children[0].pt.prefWidthFor);
                }
                return rx.of([null, pw, ph]);
            }), rx.map(([, cw, ch]) => {
                children[0].ft.onSize(cw > maxWidth ? maxWidth : cw, ch > maxHeight ? maxHeight : ch).dp(m);
            }), rx.take(1)), rx.defer(() => {
                service.log('-- >>> child set position start');
                return children[0].table.l.onSize;
            }).pipe(rx.map(([, cWidth, cHeight]) => {
                const posX = hor === 'Left' ? x + w - cWidth : x;
                const posY = ver === 'up' ? y - cHeight : y + h;
                childPos.set(children[0], [posX, posY]);
                ft.onChildPositions(childPos).dp(m);
            }), rx.take(1)));
        }
        else {
            return table.l.setRelativePos.pipe(rx.map(([, x, y]) => {
                children[0].ft.onSize(9, 1).dp(m);
                childPos.set(children[0], [x, y]);
                ft.onChildPositions(childPos).dp(m);
            }), rx.take(1));
        }
    })));
    r('show -> setDisplay', pt.show.pipe(rx.map(() => ft.setDisplay(DisplayMode.visible))));
    r('hide -> setDisplay', pt.hide.pipe(rx.map(() => {
        ft.setDisplay(DisplayMode.hidden);
    })));
    r('setRelativePos -> isDocked', pt.setRelativePos.pipe(rx.map(([m]) => {
        ft.isDocked(false).dp(m);
    })));
    r('dockTo... -> isDocked', pt.dockTo.pipe(rx.switchMap(([m, c]) => c.ft.queryAbsBounding().re(m).od(c.pt.didQueryAbsBounding).pipe(rx.map(([m2, r]) => {
        if (r)
            ft.isDocked(r).dp(m, m2);
    })))));
    content.ft.setFocusable(true).dp();
    content.ft.setFocusStyle(null).dp();
    ft.addChild(content).dp();
    ft.addReflowAction(pt.isDocked).dp();
    ft.setRelativePos(0, 0).dp();
    ft.isDocked(false).dp();
});
export function showPopupFor(dockTo, content, attrs, opts) {
    var _a, _b;
    const popup = positionalFac.create(content, opts);
    if (attrs === null || attrs === void 0 ? void 0 : attrs.relativePos)
        popup.ft.setRelativePos(...attrs.relativePos).dp((_a = attrs === null || attrs === void 0 ? void 0 : attrs.actionMeta) !== null && _a !== void 0 ? _a : undefined);
    popup.ft.dockTo(dockTo).dp((_b = attrs === null || attrs === void 0 ? void 0 : attrs.actionMeta) !== null && _b !== void 0 ? _b : undefined);
    popup.r('"showPopupFor"', queryElevatorContainer(dockTo).pipe(rx.mergeMap(elevator => {
        var _a;
        elevator.ft.addLayer(popup, attrs === null || attrs === void 0 ? void 0 : attrs.allowUserEvents).dp((_a = attrs === null || attrs === void 0 ? void 0 : attrs.actionMeta) !== null && _a !== void 0 ? _a : undefined);
        popup.ft.show().dp();
        return popup.pt.hide.pipe(rx.map(([m]) => {
            elevator.ft.removeChild(popup).dp(m);
        }));
    }), rx.take(1)));
    return popup;
}
export function bindToolTipsTo(c, tooltips, delayShowMs = 800, opts) {
    c.r('c.onEnter -> "showPopupFor",popup.hide', c.pt.onEnter.pipe(rx.switchMap(([m]) => {
        return rx.timer(delayShowMs).pipe(rx.takeUntil(c.pt.onLeave), rx.map(() => {
            let textComp;
            if (typeof tooltips === 'string') {
                const bordedText = textFac.create(tooltips, Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.label' : 'popup.label', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.textOpts));
                bordedText.ft.setPadding(0, 1, 0, 1).dp(m);
                textComp = bordedText;
            }
            else {
                textComp = tooltips;
            }
            const popup = showPopupFor(c, textComp, {
                actionMeta: m,
                allowUserEvents: false
            }, Object.assign({ debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log, name: opts === null || opts === void 0 ? void 0 : opts.name }, opts === null || opts === void 0 ? void 0 : opts.positionalOpts));
            return [popup, textComp];
        }), rx.mergeMap(([popup, textComp]) => querySchemeForComponent(textComp).pipe(rx.map(([colors]) => {
            textComp.ft.setBackground(`bgHex(${colors.inverseSurface})`).dp();
            textComp.ft.setForeground([`hex(${colors.inverseOnSurface})`]).dp();
        }), rx.takeUntil(rx.merge(queryAppContext(c, m).pipe(rx.switchMap(({ keyEventService }) => keyEventService.pt.onEsc)), c.pt.onLeave).pipe(rx.map(([m2]) => {
            popup.ft.hide().dp(m2, m);
        }))))));
    })));
}
//# sourceMappingURL=positional-popup.js.map