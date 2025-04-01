import rl from 'node:readline';
import * as rx from 'rxjs';
import {SingleActionFactory, SimplexReactorOfFac, ActionMeta, CreateOptsOfExtendedFac} from '@wfh/reactivizer';
import {canvasFac} from './canvas.js';
import {KeyEventServcie, createKeyEventService} from './keyEvent.js';

export interface TerminalCanvasInput {
  setFullScreenMode(keyEventService?: KeyEventServcie): SingleActionFactory;
  /** If width or height is larger than the number of available columens and rows,
  * it is same effect as "setFullScreenMode" */
  setSize(width: number, height: number, keyEventService?: KeyEventServcie): SingleActionFactory;
  scrollUp(lines: number): SingleActionFactory;
  scrollDown(lines: number): SingleActionFactory;
  autoHideCursor(): SingleActionFactory;
  /** Replied by "doneReportCursor", Terminal-keyEvent service must be enabled before dispatching this action */
  reportCursor(keyEventService: KeyEventServcie): SingleActionFactory;
  /**
   * move cursor to right bottom corner of the canvas and print a line wrap character,
  * so that when process exits, terminal's cursor will be right beginning of next empty line,
  * this leaves a clear screen of previous printed content.
  *
  * There is a message "onPrintDescentEndFlushed" follows after `stdout.write()`'s callback is executed.
  **/
  printDescentEnd(): SingleActionFactory;
}

interface TerminalCanvasEvents extends TerminalCanvasInput {
  /** In context of action "reportCursor", 0 based number */
  doneReportCursor(col: number, row: number): SingleActionFactory;
  onKeyEventService(keyEventService: KeyEventServcie): SingleActionFactory;
  /** A event dispatched after all onPrintText messages for a single corresponding "render" event are
   * handled and relavant process.stdout.write callbacks are called.
  * This message is under context of "render" message */
  onWriteFlushed(renderActionMeta: ActionMeta): SingleActionFactory;
  /** In context of printDescentEnd */
  onPrintDescentEndFlushed(): SingleActionFactory;
}
const tableFor = ['onKeyEventService'] as const;
export type TerminalCanvasOpts = CreateOptsOfExtendedFac<typeof canvasFac, TerminalCanvasEvents>;
export const terminalCanvasFac = canvasFac.forExtend<TerminalCanvasEvents, typeof tableFor, TerminalCanvasOpts>({
  name: 'canvas',
  tableFor
}).defineReactor(({init, setting: opts}) => {
  const service = init(opts);
  const {pt, ft, r, table} = service;
  r('autoHideCursor', pt.autoHideCursor.pipe(
    rx.map(() => {
      process.stdout.write('\x1B[?25l');
      const reset = () => process.stdout.write('\x1B[?25h');
      process.on('exit', reset);
      process.on('SIGINT', () => {
        reset();
        process.exit(0);
      });
    }),
    rx.take(1)
  ));
  r('scrollUp', pt.scrollUp.pipe(
    rx.map(([, lines]) => {
      process.stdout.write('\x1B[' + lines + 'S');
    })
  ));
  r('scrollDown', pt.scrollDown.pipe(
    rx.map(([, lines]) => {
      process.stdout.write('\x1B[' + lines + 'T');
    })
  ));
  // Refer to https://en.wikipedia.org/wiki/ANSI_escape_code
  r('reportCursor -> doneReportCursor', pt.reportCursor.pipe(
    rx.switchMap(([m, keyEventService]) => {
      return rx.merge(
        keyEventService.pt.onReportCursor.pipe(
          rx.take(1),
          rx.map(([, x, y]) => ft.doneReportCursor(x - 1, y - 1).dp(m))
        ),
        new rx.Observable(sub => {
          process.stdout.write('\x1B[6n');
          sub.complete();
        }));
    })
  ));
  r('onClearLine', pt.onClearLine.pipe(
    rx.map(([, y, x, dir]) => {
      if (x != null) {
        rl.cursorTo(process.stdout, x, y);
        rl.clearLine(process.stdout, dir ?? 1);
      } else {
        rl.cursorTo(process.stdout, 0, y);
        rl.clearLine(process.stdout, 0);
      }
    })
  ));
  r('setFullScreen -> setBounding,onKeyEventService', pt.setFullScreenMode.pipe(
    rx.exhaustMap(([m, keyEventService]) => {
      keyEventService ??= createKeyEventService({debug: opts?.debug, log: opts?.log});
      ft.onKeyEventService(keyEventService).dp(m);
      const blankLines = '\n'.repeat(process.stdout.rows - 1);
      return new rx.Observable(sub => {
        process.stdout.write(blankLines, () => {
          sub.next();
        });
      }).pipe(
        rx.take(1),
        rx.switchMap(() => {
          ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
          return new rx.Observable(() => {
            const handleResize = () => {
              ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
            };
            process.stdout.on('resize', handleResize);
            return () => {
              process.stdout.off('resize', handleResize);
            };
          });
        })
      );
    })
  ));
  r('setSize -> setBounding,onKeyEventService', pt.setSize.pipe(
    rx.switchMap(([m, w, h, keyEventService]) => {
      keyEventService ??= createKeyEventService({debug: opts?.debug, log: opts?.log});
      ft.onKeyEventService(keyEventService).dp(m);
      const cols = w > process.stdout.columns ? process.stdout.columns : w;
      const rows = h > process.stdout.rows ? process.stdout.rows : h;
      const blankLines = '\n'.repeat(rows - 1);
      return ft.reportCursor(keyEventService).re(m).od(
        pt.doneReportCursor
      ).pipe(
        rx.take(1),
        rx.switchMap(([, , top]) => new rx.Observable<number>(s => {
          process.stdout.write(blankLines, () => {s.next(top);});
        })),
        rx.map(top => {
          if (top + rows > process.stdout.rows)
            top = process.stdout.rows - rows;

          ft.setBounding(0, top, cols, rows).dp(m);
        })
      );
    })
  ));
  r('onKeyEventService,keyEventService.onExit|destory$ -> printDescentEnd,keyEventService.dispose',
    table.l.onKeyEventService.pipe(
      rx.switchMap(([, keyEventService]) => {
        return rx.merge(
          new rx.Observable(() => {
            const remove = keyEventService.preHooks.onExit('before onExit', m => {
              return ft.printDescentEnd().re(m).od(pt.onPrintDescentEndFlushed).pipe(
                rx.take(1)
              );
            });
            return remove;
          }),
          service.destory$.pipe(
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            rx.map(() => keyEventService.dispose())
          )
        );
      })
    ));
  r('printDescentEnd -> onPrintDescentEndFlushed', pt.printDescentEnd.pipe(
    rx.mergeMap(([m]) => {
      return table.l.setBounding.pipe(
        rx.take(1),
        rx.map(([, left, top, w, h]) => {
          return rl.cursorTo(
            process.stdout, left + w - 1, top + h - 1,
            () => {
              ft.onPrintDescentEndFlushed().dp(m);
            }
          );
        })
      );
    })
  ));
  r('render,onPrintText... -> onWriteFlushed', pt.render.pipe(
    rx.mergeMap(([m]) => {
      const processCallbacks = new rx.ReplaySubject<void>();
      return pt.onPrintText.pipe(
        rx.map(([, x, y, text]) => {
          rl.cursorTo(process.stdout, x, y);
          process.stdout.write(text, () => {
            processCallbacks.next();
          });
        }),
        rx.takeUntil(pt.onRendered),
        rx.count(),
        rx.mergeMap(count => {
          return processCallbacks.pipe(
            rx.take(count),
            rx.finalize(() => {
              ft.onWriteFlushed(m).dp(m);
            })
          );
        })
      );
    })
  ));
  ft.autoHideCursor().dp();
});
export type TerminalCanvas = SimplexReactorOfFac<typeof terminalCanvasFac>;

export function createTerminalCanvas(opts?: TerminalCanvasOpts) {
  return terminalCanvasFac.setting(opts).create();
}

