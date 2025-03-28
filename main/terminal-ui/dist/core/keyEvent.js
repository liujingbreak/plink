import rl from 'readline';
import * as rx from 'rxjs';
import { SimplexReactor } from '@wfh/reactivizer';
export var KeyEventEnum;
(function (KeyEventEnum) {
    KeyEventEnum[KeyEventEnum["scrollLeft"] = 0] = "scrollLeft";
    KeyEventEnum[KeyEventEnum["scrollRight"] = 1] = "scrollRight";
    KeyEventEnum[KeyEventEnum["scrollUp"] = 2] = "scrollUp";
    KeyEventEnum[KeyEventEnum["scrollDown"] = 3] = "scrollDown";
    KeyEventEnum[KeyEventEnum["scrollTop"] = 4] = "scrollTop";
    KeyEventEnum[KeyEventEnum["scrollBottom"] = 5] = "scrollBottom";
    KeyEventEnum[KeyEventEnum["home"] = 6] = "home";
    KeyEventEnum[KeyEventEnum["end"] = 7] = "end";
    KeyEventEnum[KeyEventEnum["focusLeft"] = 8] = "focusLeft";
    KeyEventEnum[KeyEventEnum["focusRight"] = 9] = "focusRight";
    KeyEventEnum[KeyEventEnum["focusUp"] = 10] = "focusUp";
    KeyEventEnum[KeyEventEnum["focusDown"] = 11] = "focusDown";
    KeyEventEnum[KeyEventEnum["focusNext"] = 12] = "focusNext";
})(KeyEventEnum || (KeyEventEnum = {}));
const tableFor = ['setPageSize', 'onDisplayKeys', 'onInputCompleted', 'setInputStream'];
export function createKeyEventService(opts) {
    const service = new SimplexReactor(Object.assign(Object.assign({ name: 'keyEvent' }, opts), { tableFor }));
    const { r, latest, ft, pt } = service;
    r('setInputStream -> onRawKeyInput', pt.setInputStream.pipe(rx.switchMap(([m, stdin, tty]) => {
        if (tty) {
            rl.emitKeypressEvents(stdin);
            stdin.setRawMode(true);
        }
        return new rx.Observable(() => {
            function h(_chr, data) {
                ft.onRawKeyInput(data).dp(m);
            }
            // function handleData(chunk: Buffer) {
            //   // TODO
            //   // service.log('>>> stdin data', chunk);
            // }
            stdin.on('keypress', h);
            // stdin.on('data', handleData);
            return () => {
                stdin.off('keypress', h);
                // stdin.off('data', handleData);
                if (tty) {
                    stdin.setRawMode(false);
                }
            };
        });
    })));
    r('onKeypress -> onDisplayKeys, onEsc', pt.onKeypress.pipe(rx.filter(([, , fallback]) => !fallback), rx.concatMap(payload => {
        const [m, evt] = payload;
        if (evt.sequence === '\x1B') {
            ft.onEsc().dp(m);
            ft.onDisplayKeys('', false, false).dp(m);
            return rx.EMPTY;
        }
        return rx.of(payload);
    }), rx.window(rx.merge(pt.onEsc, pt.onInputCompleted.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.filter(([, completed]) => completed)))), rx.switchMap(branched => rx.concat(branched.pipe(rx.scan((acc, [m, keyEvt]) => {
        var _a;
        acc += (_a = keyEvt.name) !== null && _a !== void 0 ? _a : keyEvt.sequence;
        ft.onDisplayKeys(acc, false, false).dp(m);
        return acc;
    }, '')), rx.combineLatest([
        latest.onInputCompleted,
        latest.onDisplayKeys
    ]).pipe(rx.take(1), rx.map(([[m, isCompleted, isValid], [m2, text]]) => {
        ft.onDisplayKeys(text, isCompleted, isValid).dp(m, m2);
        return false;
    }))))));
    r('consumeMultiKey -> consumeDigital, consumePageAction, didConsumeMultiKey, onEscOrQuit', pt.consumeMultiKey.pipe(rx.mergeMap(([m, evt]) => {
        var _a;
        const kname = (_a = evt.name) !== null && _a !== void 0 ? _a : evt.sequence;
        return (/[0-9]/.test(kname)) ?
            ft.consumeDigital(kname).re(m).od(pt.doneConsumeDigital).pipe(rx.take(1), rx.mergeMap(([, times]) => {
                return pt.onKeypress.pipe(rx.observeOn(rx.queueScheduler), rx.take(1), rx.mergeMap(([, nextEvt]) => ft.consumeMultiKey(nextEvt).re(m).od(pt.didConsumeMultiKey).pipe(rx.take(1), rx.map(([, act, amount]) => ft.didConsumeMultiKey(act, amount * times).dp(m)))));
            }), rx.takeUntil(pt.onEsc)) :
            (kname === 'z' || kname === 'd' || kname === 'f' || kname === 'u' || kname === 'b') ?
                ft.consumePageAction(evt).od(pt.doneConsumePageAction).pipe(rx.take(1), rx.map(([, act, quantity]) => ft.didConsumeMultiKey(act, quantity !== null && quantity !== void 0 ? quantity : 1).dp(m)), rx.takeUntil(pt.onEsc)) :
                evt.sequence === 'g' ?
                    pt.onKeypress.pipe(rx.take(1), rx.map(([m2, evt]) => {
                        if (evt.sequence === 'g') {
                            ft.didConsumeMultiKey(KeyEventEnum.scrollTop, 0).dp(m);
                        }
                        else {
                            ft.didConsumeMultiKey(null, 0).dp(m);
                            ft.onKeypress(evt, true).dp(m2);
                        }
                    })) :
                    new rx.Observable(sub => {
                        if (kname === 'l')
                            ft.didConsumeMultiKey(KeyEventEnum.scrollRight, 1).dp(m);
                        else if (kname === 'h') {
                            ft.didConsumeMultiKey(KeyEventEnum.scrollLeft, 1).dp(m);
                        }
                        else if (kname === 'j') {
                            ft.didConsumeMultiKey(KeyEventEnum.scrollDown, 1).dp(m);
                        }
                        else if (kname === 'k') {
                            ft.didConsumeMultiKey(KeyEventEnum.scrollUp, 1).dp(m);
                        }
                        else if (evt.code === '[C') {
                            ft.didConsumeMultiKey(KeyEventEnum.focusRight, 1).dp(m);
                        }
                        else if (evt.code === '[D') {
                            ft.didConsumeMultiKey(KeyEventEnum.focusLeft, 1).dp(m);
                        }
                        else if (evt.code === '[B') {
                            ft.didConsumeMultiKey(KeyEventEnum.focusDown, 1).dp(m);
                        }
                        else if (evt.code === '[A') {
                            ft.didConsumeMultiKey(KeyEventEnum.focusUp, 1).dp(m);
                        }
                        else if (evt.sequence === '\t') {
                            ft.didConsumeMultiKey(KeyEventEnum.focusNext, 1).dp(m);
                        }
                        else if (kname === 'q' || (evt.ctrl && evt.name === 'c')) {
                            ft.onExit().dp();
                        }
                        else if (evt.sequence === '^' || evt.code === '[H') {
                            ft.didConsumeMultiKey(KeyEventEnum.home, 0).dp(m);
                        }
                        else if (evt.sequence === '$' || evt.code === '[F') {
                            ft.didConsumeMultiKey(KeyEventEnum.end, 0).dp(m);
                        }
                        else if (evt.sequence === 'G') {
                            ft.didConsumeMultiKey(KeyEventEnum.scrollBottom, 0).dp(m);
                        }
                        else {
                            ft.didConsumeMultiKey(null, 1).dp(m);
                        }
                        sub.complete();
                    });
    })));
    r('consumeDigital, onKeypress -> doneConsumeDigital, onKeypress', pt.consumeDigital.pipe(rx.mergeMap(([m, c]) => {
        let word = c;
        let lastEvt;
        return pt.onKeypress.pipe(rx.observeOn(rx.queueScheduler), rx.map(([, evt]) => {
            var _a;
            if (/[0-9]/.test((_a = evt.name) !== null && _a !== void 0 ? _a : evt.sequence)) {
                word += evt.name;
                return true;
            }
            lastEvt = evt;
            return false;
        }), rx.takeWhile(yes => yes), 
        // rx.takeUntil(pt.onEsc),
        rx.finalize(() => {
            ft.doneConsumeDigital(Number(word)).dp(m);
            if (lastEvt)
                ft.onKeypress(lastEvt, true).dp(m);
        }));
    })));
    r('consumePageAction -> doneConsumePageAction', pt.consumePageAction.pipe(rx.withLatestFrom(latest.setPageSize), rx.mergeMap(([[m, evt], [, w, h]]) => {
        if (evt.name === 'z')
            return pt.onKeypress.pipe(rx.take(1), rx.map(([, evt2]) => {
                if (evt2.name === 'l')
                    ft.doneConsumePageAction(KeyEventEnum.scrollRight, w >> 1).dp(m);
                else if (evt2.name === 'h')
                    ft.doneConsumePageAction(KeyEventEnum.scrollLeft, w >> 1).dp(m);
                else {
                    ft.onEsc().dp(m);
                    ft.onKeypress(evt2, true).dp(m);
                }
            }));
        else {
            ft.doneConsumePageAction((evt.name === 'd' || evt.name === 'f') ? KeyEventEnum.scrollDown : KeyEventEnum.scrollUp, (evt.name === 'u' || evt.name === 'd') ? (h >> 1) : h).dp(m);
            return rx.EMPTY;
        }
    })));
    ft.onDisplayKeys('', false, false).dp();
    ft.onInputCompleted(false, false).dp();
    r('onKeypress -> consumeMultiKey, onInputCompleted...', pt.onKeypress.pipe(rx.observeOn(rx.queueScheduler), rx.exhaustMap(([m, evt]) => {
        ft.onInputCompleted(false, false).dp(m);
        return ft.consumeMultiKey(evt).od(pt.didConsumeMultiKey).pipe(rx.take(1), rx.takeUntil(pt.onEsc), rx.map(([, act, amount]) => {
            let valid = true;
            if (act === KeyEventEnum.scrollLeft)
                ft.onLeft(amount).dp(m);
            else if (act === KeyEventEnum.scrollRight)
                ft.onRight(amount).dp(m);
            else if (act === KeyEventEnum.scrollUp)
                ft.onUp(amount).dp(m);
            else if (act === KeyEventEnum.scrollDown)
                ft.onDown(amount).dp(m);
            else if (act === KeyEventEnum.focusUp || act === KeyEventEnum.focusDown ||
                act === KeyEventEnum.focusLeft || act === KeyEventEnum.focusRight ||
                act === KeyEventEnum.focusNext)
                ft.onFocusChange(act, amount).dp(m);
            else if (act == null) {
                valid = false;
            }
            ft.onInputCompleted(true, valid).dp(m);
        }));
    })));
    r('bindToScrollable', pt.bindToScrollable.pipe(rx.switchMap(([m, scrollable]) => {
        return rx.merge(scrollable.latest.onSize.pipe(rx.map(([, w, h]) => {
            return ft.setPageSize(w, h).dp(m);
        })), pt.onLeft.pipe(rx.map(([m, amount]) => {
            scrollable.ft.scroll(-amount, 0).dp(m);
        })), pt.onUp.pipe(rx.map(([m, amount]) => {
            scrollable.ft.scroll(0, -amount).dp(m);
        })), pt.onRight.pipe(rx.map(([m, amount]) => {
            scrollable.ft.scroll(amount, 0).dp(m);
        })), pt.onDown.pipe(rx.map(([m, amount]) => {
            scrollable.ft.scroll(0, amount).dp(m);
        })), pt.didConsumeMultiKey.pipe(rx.withLatestFrom(scrollable.latest.onValidScroll), rx.map(([[m, act], [, x, y]]) => {
            if (act === KeyEventEnum.scrollTop)
                scrollable.ft.scrollTo(x, 0).dp(m);
            else if (act === KeyEventEnum.scrollBottom)
                scrollable.ft.scrollTo(x, Number.MAX_VALUE).dp(m);
            else if (act === KeyEventEnum.home)
                scrollable.ft.scrollTo(0, y).dp(m);
            else if (act === KeyEventEnum.end)
                scrollable.ft.scrollTo(Number.MAX_VALUE, y).dp(m);
        })));
    })));
    r('onRawKeyInput -> onKeypress,onMouseEvent', pt.onRawKeyInput.pipe(rx.exhaustMap(([m1, evt]) => {
        var _a, _b;
        if (evt.sequence) {
            const m = /^\x1B\[(\d+);(\d+)R?/.exec(evt.sequence);
            if (m) {
                const row = Number(m[1]);
                let col = -1;
                let sCol = m[2];
                if (evt.sequence.endsWith('R')) {
                    col = Number(sCol);
                    ft.onReportCursor(col, row).dp(m1);
                    return rx.EMPTY;
                }
                else {
                    return pt.onRawKeyInput.pipe(rx.takeUntil(pt.onReportCursor), rx.map(([m2, evt2]) => {
                        const match = /^(\d*)R$/.exec(evt2.sequence);
                        if (match == null) {
                            sCol += evt2.sequence;
                        }
                        else if (match[1]) {
                            col = Number(sCol + match[1]);
                            ft.onReportCursor(col, row).dp(m1, m2);
                        }
                        else if (match[1].length === 0) {
                            col = Number(sCol);
                            ft.onReportCursor(col, row).dp(m1, m2);
                        }
                    }));
                }
            }
            else {
                // keys of SGR extended mouse
                const m = /^\x1B\[<(.*?)[M]?$/i.exec(evt.sequence);
                if (m) {
                    let buf = (_a = m[1]) !== null && _a !== void 0 ? _a : '';
                    if (m[0].endsWith('c')) {
                        service.log('>> mouse code c:', evt, m[1]);
                        return rx.EMPTY;
                    }
                    else {
                        return pt.onRawKeyInput.pipe(rx.tap(([, evt]) => buf += evt.sequence), rx.takeWhile(([, evt]) => !/[mM]$/.test(evt.sequence)), rx.finalize(() => {
                            const conjSequence = buf.slice(0, -1);
                            const [b, x, y] = conjSequence.split(';').map(it => Number(it));
                            if (buf.charAt(buf.length - 1) === 'm') {
                                const evt = parseMouseButton(b, true);
                                ft.onMouseEvent(evt, x, y, conjSequence).dp(m1);
                            }
                            else {
                                const evt = parseMouseButton(b, false);
                                ft.onMouseEvent(evt, x, y, conjSequence).dp(m1);
                            }
                        }));
                    }
                }
                else {
                    let m = /^\x1B\[M(.*)$/i.exec(evt.sequence);
                    if (m) {
                        const rest = m[1];
                        return rest.length === 0
                            ? pt.onRawKeyInput.pipe(rx.take(3), rx.map(evt2 => {
                                service.log(' -- mouse code cont', evt2);
                            }))
                            : rx.EMPTY;
                        // const buttonCode = m[1].charCodeAt(0) - 33;
                        // const x = m[2].charCodeAt(0) - 33;
                        // const y = m[3].charCodeAt(0) - 33;
                        // service.log('>> mouse code:', evt, buttonCode, x, y);
                        // ft.onMouseEvent({}, x, y, evtSequence)
                    }
                    m = /^\x1b\[\?(.*?)c?$/i.exec(evt.sequence);
                    if (m) {
                        let buf = (_b = m[1]) !== null && _b !== void 0 ? _b : '';
                        if (m[0].endsWith('c')) {
                            service.log('Device attributes', m[1]);
                            return rx.EMPTY;
                        }
                        else {
                            return pt.onRawKeyInput.pipe(rx.tap(([, evt]) => buf += evt.sequence), rx.takeWhile(([, evt]) => !evt.sequence.endsWith('c')), rx.finalize(() => {
                                service.log('Device attributes', buf.slice(0, -1));
                            }));
                        }
                    }
                }
            }
        }
        ft.onKeypress(evt, false).dp(m1);
        return rx.EMPTY;
    })));
    // Enable and disable Mouse device
    const reset = () => {
        // process.stdout.write('\x1b[?1000;1003l;1005l');
    };
    process.on('exit', reset);
    process.on('SIGINT', () => {
        reset();
        process.exit(0);
    });
    setImmediate(() => {
        // TODO: mouse tracking, currently:
        // - Windows console partially works on 1005 and when 1006 is off.
        // - Termux (Android) works on 1000
        // - Mac OSX works on 1006 (need to confirm)
        // Read ../sample/check-mouse.js for control code explanation
        // process.stdout.write('\x1b[?1000h');
        // process.stdout.write('\x1b[?1003h');
        // process.stdout.write('\x1b[?1005h');
        // process.stdout.write('\x1b[?1015h');
        process.stdout.write('\x1b[1;2\'z\x1b[1;3\'{');
        process.stdout.write('\x1b[>1h\x1b[>6h\x1b[>7h\x1b[>1h\x1b[>9l');
        process.stdout.write('\x1b[?9h');
    });
    // Query device attributes
    // process.stdout.write('\x1b[0c');
    ft.setPageSize(10, 10).dp();
    ft.setInputStream(process.stdin, true).dp();
    return service;
}
function parseMouseButton(b, mouseup) {
    let button = b & 3;
    let evType;
    const evOpts = {};
    // > Additional buttons are encoded like the wheel mice,
    // >   • by adding 64 (for buttons 4 through 7), or
    // >   • by adding 128 (for buttons 8 through 11).
    if (b & 64 || b & 128) {
        if (b & 64)
            button |= 4;
        if (b & 128)
            button |= 8;
    }
    else if (button === 3)
        button = undefined;
    else
        button += 1; // Only increment button if in the range 0-2.
    if (b & 32) {
        evType = 'mousemove';
    }
    else if (button === undefined || mouseup) {
        evType = 'mouseup';
    }
    else if (button === 4) {
        evType = 'wheel';
        evOpts.direction = -1;
    }
    else if (button === 5) {
        evType = 'wheel';
        evOpts.direction = 1;
    }
    else {
        evType = 'mousedown';
    }
    // > The next three bits encode the modifiers which were down when the button was pressed
    // > and are added together: 4=Shift, 8=Alt, 16=Control.
    // > Note however that the shift and control bits are normally unavailable because xterm uses the control modifier
    // > with mouse for popup menus, and the shift modifier is used in the default translations for button events.
    evOpts.shift = Boolean(b & 4);
    evOpts.alt = Boolean(b & 8);
    evOpts.ctrl = Boolean(b & 16);
    evOpts.type = evType;
    return evOpts;
}
//# sourceMappingURL=keyEvent.js.map