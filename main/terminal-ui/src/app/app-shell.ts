import * as rx from 'rxjs';
import {CoreOptions} from '@wfh/reactivizer';
import {createScrollable, createFlexContainer, BaseWidget, createKeyEventService,
  createTerminalCanvas} from '../index';
import {createStatusbar} from './statusbar';

export function createApp(mainComponent: BaseWidget, opts: CoreOptions) {
  const root = createFlexContainer({name: 'AppShell', ...opts as any});
  root.s.ft.setDirection('col').dp();
  const statusbar = createStatusbar(opts as any);
  const scrollable = createScrollable(mainComponent, opts as any);
  scrollable.s.ft.setFlexGrow(1).dp();
  root.s.ft.addChild(scrollable.asBaseType.asBaseType, statusbar.asBaseType.asBaseType.asBaseType).dp();
  const canvas = createTerminalCanvas(opts as Pick<CoreOptions, 'debug'>);
  canvas.s.ft.autoHideCursor().dp();
  canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
  const keyEventService = createKeyEventService(canvas, opts as any);
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
  canvas.s.ft.setRenderOnRequest(true).dp();
  canvas.s.ft.requestRender().dp();
  return {canvas, root};
}
