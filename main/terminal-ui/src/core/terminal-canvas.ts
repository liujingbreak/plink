import rl from 'node:readline';
import * as rx from 'rxjs';
import {SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac} from '@wfh/reactivizer';
import {canvasFac} from './canvas';
import {KeyEventServcie} from './keyEvent';

export interface TerminalCanvasInput {
  setFullScreenMode(): SingleActionFactory;
  /** If width or height is larger than the number of available columens and rows,
  * it is same effect as "setFullScreenMode" */
  setSize(width: number, height: number, keyEventService: KeyEventServcie): SingleActionFactory;
  scrollUp(lines: number): SingleActionFactory;
  scrollDown(lines: number): SingleActionFactory;
  autoHideCursor(): SingleActionFactory;
  /** Replied by "doneReportCursor", Terminal-keyEvent service must be enabled before dispatching this action */
  reportCursor(keyEventService: KeyEventServcie): SingleActionFactory;
}

interface TerminalCanvasEvents extends TerminalCanvasInput {
  /** In context of action "reportCursor", 0 based number */
  doneReportCursor(col: number, row: number): SingleActionFactory;
}
export type TerminalCanvasOpts = CreateOptsInDef<TerminalCanvasEvents, typeof canvasFac>;
export const terminalCanvasFac = canvasFac.forExtend<TerminalCanvasEvents>({
  name: 'canvas'
}).defineReactor((init, opts?: TerminalCanvasOpts) => {
  const service = init(opts);
  const {pt, ft, r} = service;
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
  r('onPrintText', pt.onPrintText.pipe(
    rx.map(([, x, y, text]) => {
      rl.cursorTo(process.stdout, x, y);
      process.stdout.write(text);
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
  r('setFullScreen -> setBounding', pt.setFullScreenMode.pipe(
    rx.exhaustMap(([m]) => {
      const blankLines = '\n'.repeat(process.stdout.rows - 1);
      return new rx.Observable(sub => {
        process.stdout.write(blankLines, () => sub.next());
      }).pipe(
        rx.take(1),
        rx.switchMap(() => {
          ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
          return new rx.Observable(sub => {
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
  r('setSize -> setBounding', pt.setSize.pipe(
    rx.switchMap(([m, w, h, keyEventService]) => {
      const cols = w > process.stdout.columns ? process.stdout.columns : w;
      const rows = h > process.stdout.rows ? process.stdout.rows : h;
      const blankLines = '\n'.repeat(rows - 1);
      return ft.reportCursor(keyEventService).re(m).od(
        pt.doneReportCursor
      ).pipe(
        rx.take(1),
        rx.switchMap(([, , top]) => new rx.Observable<number>(s => {
          process.stdout.write(blankLines, () => s.next(top));
        })),
        rx.map((top) => {
          if (top + rows > process.stdout.rows)
            top = process.stdout.rows - rows;

          ft.setBounding(0, top, cols, rows).dp(m);
        })
      );
    })
  ));
});
export type TerminalCanvas = SimplexReactorOfFac<typeof terminalCanvasFac>;

export function createTerminalCanvas(opts?: TerminalCanvasOpts) {
  return terminalCanvasFac.create(opts);
}

