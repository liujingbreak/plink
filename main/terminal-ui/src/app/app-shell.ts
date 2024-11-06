import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory, SimplexReactor, SimplexReactorOptions} from '@wfh/reactivizer';
import {createScrollable, createFlexContainer, BaseWidget, createKeyEventService,
  createTerminalCanvas, createElevator, createTextWidget, createBorderContainer,
  DisplayMode, ScrollableOptions, TerminalCanvasOptions, ElevatorOptions,
  FlexContainer, FlexContainerOpts, KeyEventOptions} from '../index';
import {createRootService, FocusableOptions} from '../focusable';
import {StatusbarOptions, createStatusbar} from './statusbar';

export interface AppActions {
  showPopup(component: BaseWidget): SingleActionFactory;
}
export interface AppSignals extends AppActions {
  /** In context of "showPopup" action */
  onPopup(component: BaseWidget): SingleActionFactory;
  onHelp(helper: FlexContainer): SingleActionFactory;
}
export interface AppOptions {
  default?: CoreOptions<any>;
  core?: SimplexReactorOptions<AppSignals>;
  statusbar?: StatusbarOptions;
  keyService?: KeyEventOptions;
  scrollable?: ScrollableOptions;
  elevator?: ElevatorOptions;
  canvas?: TerminalCanvasOptions;
  cover?: FlexContainerOpts;
  main?: FlexContainerOpts;
  focusable?: FocusableOptions;
}
export function createApp(mainComponent: BaseWidget, opts?: AppOptions) {
  const appService = new SimplexReactor<AppSignals>({
    ...opts?.default as SimplexReactorOptions<AppSignals>,
    ...opts?.core,
    name: opts?.default?.name ?? 'App'
  });
  const main = createFlexContainer({
    ...opts?.default as FlexContainerOpts,
    name: 'main',
    ...opts?.main
  });
  main.s.ft.setDirection('col').dp();
  const statusbar = createStatusbar({
    ...opts?.default as StatusbarOptions,
    name: 'Statusbar',
    ...opts?.statusbar
  });
  const scrollable = createScrollable(mainComponent, {
    ...opts?.scrollable,
    default: {
      ...opts?.default as ScrollableOptions['default'],
      name: 'AppScrollable',
      ...opts?.scrollable?.default
    }
  });
  scrollable.s.ft.setFlexGrow(1).dp();
  main.s.ft.addChild(scrollable, statusbar).dp();
  const canvas = createTerminalCanvas({
    ...opts?.default as TerminalCanvasOptions,
    ...opts?.canvas
  });
  canvas.s.ft.autoHideCursor().dp();
  const keyEventService = createKeyEventService(canvas, {
    ...opts?.default as KeyEventOptions,
    ...opts?.keyService
  });
  // keyEventService.config({debug: true});
  keyEventService.s.ft.bindToScrollable(scrollable).dp();
  statusbar.s.ft.trackKeypressService(keyEventService).dp();
  statusbar.s.ft.trackScrollable(scrollable).dp();
  main.r('keyEventService.onExit', keyEventService.s.pt.onExit.pipe(
    rx.concatMap(() => rx.timer(32)),
    rx.map(() => {
      main.dispose();
      canvas.dispose();
      keyEventService.dispose();
      process.exit();
    })
  ));
  keyEventService.r('onKeypress', keyEventService.s.pt.onKeypress.pipe(
    rx.filter(([, evt]) => evt.name === 'return'),
    rx.exhaustMap(([m]) => {
      appService.log('>>> on help');
      coverLayer.s.ft.setDisplay(DisplayMode.visible).dp(m);
      appService.s.ft.onHelp(coverLayer).dp(m);
      return keyEventService.s.pt.onBreak.pipe(
        rx.take(1),
        rx.map(([m]) => {
          coverLayer.s.ft.setDisplay(DisplayMode.none).dp(m);
        })
      );
    })
  ));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const elevator = createElevator({default: opts?.default as any, ...opts?.elevator});
  const coverLayer = createFlexContainer({
    ...opts?.default as FlexContainerOpts,
    name: 'coverLayer',
    ...opts?.cover
  });
  const focusable = createRootService(keyEventService, {...opts?.default as any, ...opts?.focusable});
  focusable.s.ft.forRootComp(elevator).dp();
  coverLayer.s.ft.alignItems('center').dp();
  coverLayer.s.ft.justifyContent('center').dp();

  // const helpBox = createFlexContainer();
  const helpNote = createTextWidget('Keyboard Help');
  const coverLayerBorder = createBorderContainer(helpNote, {...opts?.default as any});
  coverLayerBorder.s.ft.setPadding(5, 5, 5, 5).dp();
  coverLayerBorder.s.ft.setBackground('bgGrey').dp();
  coverLayerBorder.s.ft.setBorder('padding').dp();
  coverLayer.s.ft.addChild(coverLayerBorder).dp();
  elevator.s.ft.addChild(
    main,
    coverLayer
  ).dp();
  coverLayer.s.ft.setDisplay(DisplayMode.none).dp();
  canvas.s.ft.setRootComponent(elevator).dp();
  canvas.s.ft.setRenderOnRequest(true).dp();
  return {canvas, main, app: appService};
}
