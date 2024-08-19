import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {createScrollable, createFlexContainer, BaseWidget, createKeyEventService,
  createTerminalCanvas, createElevator, createTextWidget, createBorderContainer,
  DisplayMode,
  FlexContainer} from '../index';
import {createStatusbar} from './statusbar';

export interface AppActions {
  showPopup(component: BaseWidget): SingleActionFactory;
}
export interface AppSignals extends AppActions {
  /** In context of "showPopup" action */
  onPopup(component: BaseWidget): SingleActionFactory;
  onHelp(helper: FlexContainer): SingleActionFactory;
}
export function createApp(mainComponent: BaseWidget, opts: CoreOptions) {
  const appService = new SimplexReactor<AppSignals>({
    ...opts as any,
    name: 'App'
  });
  const root = createFlexContainer({name: 'AppShell', ...opts as any});
  root.s.ft.setDirection('col').dp();
  const statusbar = createStatusbar(opts as any);
  const scrollable = createScrollable(mainComponent, opts as any);
  scrollable.s.ft.setFlexGrow(1).dp();
  root.s.ft.addChild(scrollable.asBaseType.asBaseType, statusbar.asBaseType.asBaseType.asBaseType).dp();
  const canvas = createTerminalCanvas(opts as Pick<CoreOptions, 'debug'>);
  canvas.s.ft.autoHideCursor().dp();
  const keyEventService = createKeyEventService(canvas, opts as any);
  // keyEventService.config({debug: true});
  keyEventService.s.ft.bindToScrollable(scrollable).dp();
  statusbar.s.ft.trackKeypressService(keyEventService).dp();
  statusbar.s.ft.trackScrollable(scrollable).dp();
  root.r('keyEventService.onExit', keyEventService.s.pt.onExit.pipe(
    rx.concatMap(() => rx.timer(32)),
    rx.map(() => {
      root.dispose();
      canvas.dispose();
      keyEventService.dispose();
      process.exit();
    })
  ));
  keyEventService.r('onKeypress', keyEventService.s.pt.onKeypress.pipe(
    rx.filter(([, evt]) => evt.name === 'return'),
    rx.exhaustMap(([m]) => {
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
  const elevator = createElevator(opts as any);
  const coverLayer = createFlexContainer({...opts as any, name: 'coverLayer'});
  coverLayer.s.ft.alignItems('center').dp();
  coverLayer.s.ft.justifyContent('center').dp();

  // const helpBox = createFlexContainer();
  const helpNote = createTextWidget('Keyboard Help');
  const coverLayerBorder = createBorderContainer(helpNote.b);
  coverLayerBorder.s.ft.setPadding(5, 5, 5, 5).dp();
  coverLayerBorder.s.ft.setBackground('bgGrey').dp();
  coverLayerBorder.s.ft.setBorder('padding').dp();
  coverLayer.s.ft.addChild(coverLayerBorder.b.b).dp();
  elevator.s.ft.addChild(
    root.b.b,
    coverLayer.b.b
  ).dp();
  coverLayer.s.ft.setDisplay(DisplayMode.none).dp();

  canvas.s.ft.setRootComponent(elevator.asBaseType.asBaseType).dp();

  canvas.s.ft.setRenderOnRequest(true).dp();
  canvas.s.ft.requestRender().dp();
  return {canvas, root, app: appService};
}
