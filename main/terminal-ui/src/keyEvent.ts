/* eslint-disable no-control-regex */
import tty from 'tty';
import rl from 'readline';
import * as rx from 'rxjs';
import {SimplexReactor, SingleActionFactory, CoreOptions} from '@wfh/reactivizer';
import {Scrollable} from './scrollable';
import {TerminalCanvas} from './canvas';

export interface KeyScrollingMsg {
  setPageSize(w: number, h: number): SingleActionFactory;
  bindToScrollable(scrollable: Scrollable): SingleActionFactory;
  /** default is process.stdin
   * @param isTTY set to `true` to enable "readline" module's "emitKeypressEvents()",
   * and enable "setRawMode(true)" on that TTY readable stream
   */
  setInputStream(stream: NodeJS.ReadableStream, isTTY: boolean): SingleActionFactory;
}
interface KeyEvents {
  onMouseEvent(evt: MouseEventOpts, x: number, y: number, evtSequence: string): SingleActionFactory;
  onFocusChange(
    dir: KeyEventEnum.focusLeft | KeyEventEnum.focusRight | KeyEventEnum.focusUp | KeyEventEnum.focusDown | KeyEventEnum.focusNext,
    amount: number): SingleActionFactory;
  onRight(amount: number): SingleActionFactory;
  onLeft(amount: number): SingleActionFactory;
  onUp(amount: number): SingleActionFactory;
  onDown(amount: number): SingleActionFactory;
  onBottom(): SingleActionFactory;
  onTop(): SingleActionFactory;
  onHome(): SingleActionFactory;
  onEnd(): SingleActionFactory;
  onExit(): SingleActionFactory;
}
export enum KeyEventEnum {
  scrollLeft, scrollRight, scrollUp, scrollDown, scrollTop, scrollBottom, home, end,
  focusLeft, focusRight, focusUp, focusDown, focusNext
}
interface keypressSignals extends KeyScrollingMsg, KeyEvents {
  onRawKeyInput(event: RawKeyEvent): SingleActionFactory;
  onKeypress(event: RawKeyEvent, fallback: boolean): SingleActionFactory;
  onDisplayKeys(text: string, isCompleted: boolean, isValid: boolean): SingleActionFactory;
  onInputCompleted(completed: boolean, valid: boolean): SingleActionFactory;
  onBreak(): SingleActionFactory;
  onDigital(chr: string): SingleActionFactory;
  consumeMultiKey(evt: RawKeyEvent): SingleActionFactory;
  didConsumeMultiKey(action: KeyEventEnum | null, amount: number): SingleActionFactory;
  consumeDigital(c: string): SingleActionFactory;
  consumePageAction(event: RawKeyEvent): SingleActionFactory;
  doneConsumePageAction(action: KeyEventEnum, amount?: number): SingleActionFactory;
  consumeDirKey(c: string): SingleActionFactory;
  doneConsumeDigital(value: number): SingleActionFactory;
  onReportCursor(x: number, y: number): SingleActionFactory;
}

const tableFor = ['setPageSize', 'onDisplayKeys', 'onInputCompleted', 'setInputStream'] as const;
interface RawKeyEvent {
  name: string | undefined;
  sequence: string;
  ctrl: boolean;
  shift: boolean;
  code?: string;
}
export type KeyEventServcie = SimplexReactor<keypressSignals, typeof tableFor>;
export type KeyEventOptions = CoreOptions<keypressSignals>;
export function createKeyEventService(canvas: TerminalCanvas, opts?: KeyEventOptions) {
  const service = new SimplexReactor<keypressSignals, typeof tableFor>({
    name: 'keyEvent',
    ...opts,
    tableFor
  });
  const {r, s, table} = service;
  const {ft} = s;
  r('setInputStream -> onRawKeyInput', s.pt.setInputStream.pipe(
    rx.switchMap(([m, stdin, tty]) => {
      if (tty) {
        rl.emitKeypressEvents(stdin);
        (stdin as tty.ReadStream).setRawMode(true);
      }
      return new rx.Observable<never>(() => {
        function h(_chr: unknown, data: RawKeyEvent) {
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
            (stdin as tty.ReadStream).setRawMode(false);
          }
        };
      });
    })
  ));
  r('onKeypress -> onDisplayKeys, onBreak', s.pt.onKeypress.pipe(
    rx.filter(([, , fallback]) => !fallback),
    rx.concatMap(payload => {
      const [m, evt] = payload;
      if (evt.sequence === '\x1B') {
        ft.onBreak().dp(m);
        ft.onDisplayKeys('', false, false).dp(m);
        return rx.EMPTY;
      }
      return rx.of(payload);
    }),
    rx.window(rx.merge(
      s.pt.onBreak,
      s.pt.onInputCompleted.pipe(
        rx.distinctUntilChanged(([, a], [, b]) => a === b),
        rx.filter(([, completed]) => completed)
      ))
    ),
    rx.switchMap(branched => rx.concat(
      branched.pipe(
        rx.scan((acc, [m, keyEvt]) => {
          acc += keyEvt.name ?? keyEvt.sequence;
          ft.onDisplayKeys(acc, false, false).dp(m);
          return acc;
        }, '')
      ),
      rx.combineLatest([
        table.l.onInputCompleted,
        table.l.onDisplayKeys
      ]).pipe(
        rx.take(1),
        rx.map(([[m, isCompleted, isValid], [m2, text]]) => {
          ft.onDisplayKeys(text, isCompleted, isValid).dp(m, m2);
          return false;
        })
      )
    ))
  ));
  r('consumeMultiKey -> consumeDigital, consumePageAction, didConsumeMultiKey, onEscOrQuit', s.pt.consumeMultiKey.pipe(
    rx.mergeMap(([m, evt]) => {
      const kname = evt.name ?? evt.sequence;
      return (/[0-9]/.test(kname)) ?
        ft.consumeDigital(kname).re(m).od(s.pt.doneConsumeDigital).pipe(
          rx.take(1),
          rx.mergeMap(([, times]) => {
            return s.pt.onKeypress.pipe(
              rx.observeOn(rx.queueScheduler),
              rx.take(1),
              rx.mergeMap(([, nextEvt]) => ft.consumeMultiKey(nextEvt).re(m).od(
                s.pt.didConsumeMultiKey
              ).pipe(
                rx.take(1),
                rx.map(([, act, amount]) => ft.didConsumeMultiKey(act, amount * times).dp(m))
              ))
            );
          }),
          rx.takeUntil(s.pt.onBreak)
        ) :
        (kname === 'z' || kname === 'd' || kname === 'f' || kname === 'u' || kname === 'b') ?
          ft.consumePageAction(evt).od(s.pt.doneConsumePageAction).pipe(
            rx.take(1),
            rx.map(([, act, quantity]) => ft.didConsumeMultiKey(act, quantity ?? 1).dp(m)),
            rx.takeUntil(s.pt.onBreak)
          ) :
          evt.sequence === 'g' ?
            s.pt.onKeypress.pipe(
              rx.take(1),
              rx.map(([m2, evt]) => {
                if (evt.sequence === 'g') {
                  ft.didConsumeMultiKey(KeyEventEnum.scrollTop, 0).dp(m);
                } else {
                  ft.didConsumeMultiKey(null, 0).dp(m);
                  ft.onKeypress(evt, true).dp(m2);
                }
              })
            ) :
            new rx.Observable<never>(sub => {
              if (kname === 'l')
                ft.didConsumeMultiKey(KeyEventEnum.scrollRight, 1).dp(m);
              else if (kname === 'h') {
                ft.didConsumeMultiKey(KeyEventEnum.scrollLeft, 1).dp(m);
              } else if (kname === 'j') {
                ft.didConsumeMultiKey(KeyEventEnum.scrollDown, 1).dp(m);
              } else if (kname === 'k') {
                ft.didConsumeMultiKey(KeyEventEnum.scrollUp, 1).dp(m);
              } else if (evt.code === '[C') {
                ft.didConsumeMultiKey(KeyEventEnum.focusRight, 1).dp(m);
              } else if (evt.code === '[D') {
                ft.didConsumeMultiKey(KeyEventEnum.focusLeft, 1).dp(m);
              } else if (evt.code === '[B') {
                ft.didConsumeMultiKey(KeyEventEnum.focusDown, 1).dp(m);
              } else if (evt.code === '[A') {
                ft.didConsumeMultiKey(KeyEventEnum.focusUp, 1).dp(m);
              } else if (evt.sequence === '\t') {
                ft.didConsumeMultiKey(KeyEventEnum.focusNext, 1).dp(m);
              } else if (kname === 'q' || (evt.ctrl && evt.name === 'c')) {
                ft.onExit().dp();
              } else if (evt.sequence === '^' || evt.code === '[H') {
                ft.didConsumeMultiKey(KeyEventEnum.home, 0).dp(m);
              } else if (evt.sequence === '$' || evt.code === '[F') {
                ft.didConsumeMultiKey(KeyEventEnum.end, 0).dp(m);
              } else if (evt.sequence === 'G') {
                ft.didConsumeMultiKey(KeyEventEnum.scrollBottom, 0).dp(m);
              } else {
                ft.didConsumeMultiKey(null, 1).dp(m);
              }
              sub.complete();
            });
    })
  ));
  r('consumeDigital, onKeypress -> doneConsumeDigital, onKeypress', s.pt.consumeDigital.pipe(
    rx.mergeMap(([m, c]) => {
      let word = c;
      let lastEvt: RawKeyEvent | undefined;
      return s.pt.onKeypress.pipe(
        rx.observeOn(rx.queueScheduler),
        rx.map(([, evt]) => {
          if (/[0-9]/.test(evt.name ?? evt.sequence)) {
            word += evt.name;
            return true;
          }
          lastEvt = evt;
          return false;
        }),
        rx.takeWhile(yes => yes),
        // rx.takeUntil(s.pt.onBreak),
        rx.finalize(() => {
          ft.doneConsumeDigital(Number(word)).dp(m);
          if (lastEvt)
            ft.onKeypress(lastEvt, true).dp(m);
        })
      );
    })
  ));
  r('consumePageAction -> doneConsumePageAction', s.pt.consumePageAction.pipe(
    rx.withLatestFrom(table.l.setPageSize),
    rx.mergeMap(([[m, evt], [, w, h]]) => {
      if (evt.name === 'z')
        return s.pt.onKeypress.pipe(
          rx.take(1),
          rx.map(([, evt2]) => {
            if (evt2.name === 'l')
              ft.doneConsumePageAction(KeyEventEnum.scrollRight, w >> 1).dp(m);
            else if (evt2.name === 'h')
              ft.doneConsumePageAction(KeyEventEnum.scrollLeft, w >> 1).dp(m);
            else {
              ft.onBreak().dp(m);
              ft.onKeypress(evt2, true).dp(m);
            }
          })
        );
      else {
        ft.doneConsumePageAction(
          (evt.name === 'd' || evt.name === 'f') ? KeyEventEnum.scrollDown : KeyEventEnum.scrollUp,
          (evt.name === 'u' || evt.name === 'd') ? (h >> 1) : h
        ).dp(m);
        return rx.EMPTY;
      }
    })
  ));
  ft.onDisplayKeys('', false, false).dp();
  ft.onInputCompleted(false, false).dp();

  r('onKeypress -> consumeMultiKey, onInputCompleted...', s.pt.onKeypress.pipe(
    rx.observeOn(rx.queueScheduler),
    rx.exhaustMap(([m, evt]) => {
      ft.onInputCompleted(false, false).dp(m);
      return ft.consumeMultiKey(evt).od(s.pt.didConsumeMultiKey).pipe(
        rx.take(1),
        rx.takeUntil(s.pt.onBreak),
        rx.map(([, act, amount]) => {
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
            act === KeyEventEnum.focusNext
          )
            ft.onFocusChange(act, amount).dp(m);
          else if (act == null) {
            valid = false;
          }
          ft.onInputCompleted(true, valid).dp(m);
        })
      );
    })
  ));
  r('bindToScrollable', s.pt.bindToScrollable.pipe(
    rx.switchMap(([m, scrollable]) => {
      return rx.merge(
        scrollable.table.l.onSize.pipe(
          rx.map(([, w, h]) => {
            return ft.setPageSize(w, h).dp(m);
          })
        ),
        s.pt.onLeft.pipe(
          rx.map(([m, amount]) => {
            scrollable.s.ft.scroll(-amount, 0).dp(m);
          })
        ),
        s.pt.onUp.pipe(
          rx.map(([m, amount]) => {
            scrollable.s.ft.scroll(0, -amount).dp(m);
          })
        ),
        s.pt.onRight.pipe(
          rx.map(([m, amount]) => {
            scrollable.s.ft.scroll(amount, 0).dp(m);
          })
        ),
        s.pt.onDown.pipe(
          rx.map(([m, amount]) => {
            scrollable.s.ft.scroll(0, amount).dp(m);
          })
        ),
        s.pt.didConsumeMultiKey.pipe(
          rx.withLatestFrom(scrollable.table.l.onValidScroll),
          rx.map(([[m, act], [, x, y]]) => {
            if (act === KeyEventEnum.scrollTop)
              scrollable.s.ft.scrollTo(x, 0).dp(m);
            else if (act === KeyEventEnum.scrollBottom)
              scrollable.s.ft.scrollTo(x, Number.MAX_VALUE).dp(m);
            else if (act === KeyEventEnum.home)
              scrollable.s.ft.scrollTo(0, y).dp(m);
            else if (act === KeyEventEnum.end)
              scrollable.s.ft.scrollTo(Number.MAX_VALUE, y).dp(m);
          })
        )
      );
    })
  ));
  r('onRawKeyInput -> onKeypress,onMouseEvent', s.pt.onRawKeyInput.pipe(
    rx.exhaustMap(([m1, evt]) => {
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
          } else {
            return s.pt.onRawKeyInput.pipe(
              rx.takeUntil(s.pt.onReportCursor),
              rx.map(([m2, evt2]) => {
                const match = /^(\d*)R$/.exec(evt2.sequence);
                if (match == null) {
                  sCol += evt2.sequence;
                } else if (match[1]) {
                  col = Number(sCol + match[1]);
                  ft.onReportCursor(col, row).dp(m1, m2);
                } else if (match[1].length === 0) {
                  col = Number(sCol);
                  ft.onReportCursor(col, row).dp(m1, m2);
                }
              })
            );
          }
        } else {
          // keys of SGR extended mouse
          const m = /^\x1B\[<(.*?)[mM]?$/i.exec(evt.sequence);
          if (m) {
            let buf = m[1] ?? '';
            if (m[0].endsWith('c')) {
              service.log('>> mouse code c:', evt, m[1]);
              return rx.EMPTY;
            } else {
              return s.pt.onRawKeyInput.pipe(
                rx.tap(([, evt]) => buf += evt.sequence),
                rx.takeWhile(([, evt]) => !/[mM]$/.test(evt.sequence)),
                rx.finalize(() => {
                  const conjSequence = buf.slice(0, -1);
                  const [b, x, y] = conjSequence.split(';').map(it => Number(it));
                  if (buf.charAt(buf.length - 1) === 'm') {
                    const evt = parseMouseButton(b, true);
                    s.ft.onMouseEvent(evt, x, y, conjSequence).dp(m1);
                  } else {
                    const evt = parseMouseButton(b, false);
                    s.ft.onMouseEvent(evt, x, y, conjSequence).dp(m1);

                  }
                })
              );
            }
          } else {
            const m = /^\x1b\[\?(.*?)c?$/i.exec(evt.sequence);
            if (m) {
              let buf = m[1] ?? '';
              if (m[0].endsWith('c')) {
                service.log('Device attributes', m[1]);
                return rx.EMPTY;
              } else {
                return s.pt.onRawKeyInput.pipe(
                  rx.tap(([, evt]) => buf += evt.sequence),
                  rx.takeWhile(([, evt]) => !evt.sequence.endsWith('c')),
                  rx.finalize(() => {
                    service.log('Device attributes', buf.slice(0, -1));
                  })
                );
              }
            }
          }
        }
      }
      ft.onKeypress(evt, false).dp(m1);
      return rx.EMPTY;
    })
  ));

  // Enable and disable Mouse device
  const reset = () => process.stdout.write('\x1b[?1000;1003;1006l');
  process.on('exit', reset);
  process.on('SIGINT', () => {
    reset();
    process.exit(0);
  });
  setImmediate(() => {
    // enable mouse event and SGR mode, refer to "blessed" program.js or tty-events.js
    process.stdout.write('\x1b[?1000h');
    process.stdout.write('\x1b[?1001h');
    process.stdout.write('\x1b[?1002h');
    process.stdout.write('\x1b[?1003h');
    process.stdout.write('\x1b[?1005h');
    process.stdout.write('\x1b[?1015h');
    process.stdout.write('\x1b[1;2\'z\x1b[1;3\'{');
    process.stdout.write('\x1b[>1h\x1b[>6h\x1b[>7h\x1b[>1h\x1b[>9l');
    // process.stdout.write('\x1b[0~ZwLMRK+1Q\x1b\\'); jsbtermMouse
    process.stdout.write('\x1b[?9h');
  });

  // Query device attributes
  // process.stdout.write('\x1b[0c');

  ft.setPageSize(10, 10).dp();
  ft.setInputStream(process.stdin, true).dp();
  return service;
}

interface MouseEventOpts {
  type: 'mousemove' | 'mouseup' | 'mousedown' | 'wheel';
  direction?: number;
  shift?: boolean;
  alt?: boolean;
  ctrl?: boolean;
}

function parseMouseButton(b: number, mouseup: boolean) {
  let button: number | undefined = b & 3;
  let evType: MouseEventOpts['type'] | undefined;
  const evOpts = {} as MouseEventOpts;
  // > Additional buttons are encoded like the wheel mice,
  // >   • by adding 64 (for buttons 4 through 7), or
  // >   • by adding 128 (for buttons 8 through 11).
  if (b & 64 || b & 128) {
    if (b & 64)
      button |= 4;
    if (b & 128)
      button |= 8;

  } else if (button === 3)
    button = undefined;
  else
    button += 1; // Only increment button if in the range 0-2.
  if (b & 32) {
    evType = 'mousemove';

  } else if (button === undefined || mouseup) {
    evType = 'mouseup';

  } else if (button === 4) {
    evType = 'wheel';
    evOpts.direction = -1;

  } else if (button === 5) {
    evType = 'wheel';
    evOpts.direction = 1;

  } else {
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
