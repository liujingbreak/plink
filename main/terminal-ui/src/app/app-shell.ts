import rl from 'node:readline';
import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory, SimplexReactor, ActionMeta, BaseReactorFactory} from '@wfh/reactivizer';
import {createScrollable, createFlexContainer, BaseWidget, createKeyEventService,
  createTerminalCanvas, createElevator, createTextWidget, createBorderContainer,
  DisplayMode, ScrollableOptions, TerminalCanvasOptions, ElevatorOptions,
  FlexContainer, FlexContainerOpts, KeyEventOptions, TerminalCanvas, KeyEventServcie,
  app} from '../index';
import {StatusbarOptions, createStatusbar} from './statusbar';

export interface AppActions {
  setFullScreenMode(): SingleActionFactory;
  /** If width or height is larger than the number of available columens and rows,
  * it is same effect as "setFullScreenMode" */
  setSize(width: number, height: number): SingleActionFactory;
  showPopup(component: BaseWidget): SingleActionFactory;
}
export interface AppSignals extends AppActions {
  /** In context of "showPopup" action */
  onExit(): SingleActionFactory;
  onPopup(component: BaseWidget): SingleActionFactory;
  onHelp(helper: FlexContainer): SingleActionFactory;
  onReady(context: AppContext): SingleActionFactory;
}
const tableFor = ['onReady'] as const;
export interface AppOptions {
  default?: Pick<CoreOptions<AppSignals>, 'debug' | 'log'>;
  core?: CoreOptions<AppSignals>;
  statusbar?: StatusbarOptions;
  keyService?: KeyEventOptions;
  scrollable?: ScrollableOptions;
  elevator?: ElevatorOptions;
  canvas?: TerminalCanvasOptions;
  cover?: FlexContainerOpts;
  main?: FlexContainerOpts;
}
export interface AppContext {
  canvas: TerminalCanvas;
  main: BaseWidget;
  app: SimplexReactor<AppSignals>;
  keyEventService: KeyEventServcie;
  statusbar: app.Statusbar;
}

const appServiceFac = new BaseReactorFactory<AppSignals, typeof tableFor>({
  name: 'App',
  tableFor
}).defineReactor((init, mainComponent: BaseWidget, canScroll?: boolean, opts?: AppOptions) => {
  const appService = init({
    ...opts?.default,
    ...opts?.core
  });
  const {r, ft, pt} = appService;
  const basePane = createFlexContainer({
    ...opts?.default as FlexContainerOpts,
    name: 'basePane',
    ...opts?.main
  });
  basePane.ft.setDirection('col').dp();
  const statusbar = createStatusbar({
    ...opts?.default as StatusbarOptions,
    name: 'Statusbar',
    ...opts?.statusbar
  });
  const keyEventService = createKeyEventService({
    ...opts?.default as KeyEventOptions,
    ...opts?.keyService
  });
  let mainContainer: BaseWidget = mainComponent;
  if (canScroll) {
    const scrollable = createScrollable(mainComponent, {
      ...opts?.scrollable,
      default: {
        ...opts?.default as ScrollableOptions['default'],
        name: 'AppScrollable',
        ...opts?.scrollable?.default
      }
    });
    scrollable.ft.setFlexGrow(1).dp();
    // main.ft.addChild(scrollable, statusbar).dp();
    mainContainer = scrollable;
    statusbar.ft.trackScrollable(scrollable).dp();
  }
  const canvas = createTerminalCanvas({
    ...opts?.default as TerminalCanvasOptions,
    ...opts?.canvas
  });
  r('setFullScreen -> onReady', pt.setFullScreenMode.pipe(
    rx.exhaustMap(([m]) => {
      const blankLines = '\n'.repeat(process.stdout.rows - 1);
      return new rx.Observable(sub => {
        process.stdout.write(blankLines, () => sub.next());
      }).pipe(
        rx.take(1),
        rx.switchMap(() => {
          canvas.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
          ft.onReady({
            canvas,
            main: basePane,
            app: appService,
            keyEventService,
            statusbar
          }).dp(m);
          return new rx.Observable(sub => {
            const handleResize = () => {
              canvas.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
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
  r('setSize -> onReady', pt.setSize.pipe(
    rx.switchMap(([m, w, h]) => {
      const cols = w > process.stdout.columns ? process.stdout.columns : w;
      const rows = h > process.stdout.rows ? process.stdout.rows : h;
      const blankLines = '\n'.repeat(rows - 1);
      return canvas.ft.reportCursor(keyEventService).re(m).od(
        canvas.pt.doneReportCursor
      ).pipe(
        rx.take(1),
        rx.switchMap(([, , top]) => new rx.Observable<number>(s => {
          process.stdout.write(blankLines, () => s.next(top));
        })),
        rx.map((top) => {
          if (top + rows > process.stdout.rows)
            top = process.stdout.rows - rows;

          canvas.ft.setBounding(0, top, cols, rows).dp(m);
          ft.onReady({
            canvas,
            main: basePane,
            app: appService,
            keyEventService,
            statusbar
          }).dp(m);
        })
      );
    })
  ));
  r('onReady', pt.onReady.pipe(
    rx.map(([m, ctx]) => {
      canvas.ft.setRenderOnRequest(true).dp(m);
      basePane.ft.addChild(mainContainer, statusbar).dp();
      canvas.ft.setRootComponent(elevator).dp();
      canvas.ft.requestRender().dp(m);
      elevator.ft.provideContext('__appshell', ctx).dp(m);
    })
  ));
  canvas.ft.autoHideCursor().dp();

  statusbar.ft.trackKeypressService(keyEventService).dp();
  r('keyEventService.onExit', keyEventService.pt.onExit.pipe(
    rx.concatMap(() => rx.timer(32)),
    rx.exhaustMap(() => {
      appService.ft.onExit().dp();
      return canvas.table.l.setBounding.pipe(
        rx.take(1)
      );
    }),
    rx.switchMap(([, left, top, w, h]) => new rx.Observable(sink => {
      rl.cursorTo(process.stdout, left + w - 1, top + h - 1, () => sink.next());
    })),
    rx.map(() => {
      // process.stdout.write('\n');
      basePane.dispose();
      canvas.dispose();
      keyEventService.dispose();
      setImmediate(() => process.exit());
    })
  ));
  r('onKeypress', keyEventService.pt.onKeypress.pipe(
    rx.filter(([, evt]) => evt.name === 'return'),
    rx.exhaustMap(([m]) => {
      appService.log('>>> on help');
      coverLayer.ft.setDisplay(DisplayMode.visible).dp(m);
      appService.ft.onHelp(coverLayer).dp(m);
      return keyEventService.pt.onBreak.pipe(
        rx.take(1),
        rx.map(([m]) => {
          coverLayer.ft.setDisplay(DisplayMode.none).dp(m);
        })
      );
    })
  ));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const elevator = createElevator(keyEventService, {default: opts?.default as any, ...opts?.elevator});
  const coverLayer = createFlexContainer({
    ...opts?.default as FlexContainerOpts,
    name: 'coverLayer',
    ...opts?.cover
  });
  coverLayer.ft.alignItems('center').dp();
  coverLayer.ft.justifyContent('center').dp();

  // const helpBox = createFlexContainer();
  const helpNote = createTextWidget('Keyboard Help');
  const coverLayerBorder = createBorderContainer(helpNote, {...opts?.default as any});
  coverLayerBorder.ft.setPadding(5, 5, 5, 5).dp();
  coverLayerBorder.ft.setBackground('bgGrey').dp();
  coverLayerBorder.ft.setBorder('none').dp();
  coverLayer.ft.addChild(coverLayerBorder).dp();
  mainContainer.ft.setFlexGrow(1).dp();
  elevator.ft.addChild(
    basePane,
    coverLayer
  ).dp();
  coverLayer.ft.setDisplay(DisplayMode.none).dp();
});

export function createApp(mainComponent: BaseWidget, canScroll = true, opts?: AppOptions) {
  return appServiceFac.create(mainComponent, canScroll, opts);
}


export function useAppContext(currComp: BaseWidget, m?: ActionMeta) {
  let fac = currComp.ft.queryContext('__appshell');
  if (m)
    fac = fac.re(m);
  return fac.od(currComp.pt.onContextChange).pipe(
    rx.map(([, , v]) => v as AppContext)
  );
}
