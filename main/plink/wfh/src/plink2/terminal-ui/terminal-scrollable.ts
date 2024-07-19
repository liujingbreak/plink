import * as rx from 'rxjs';
import {BaseWidget, createBase} from './terminal-widget';
import {createTerminalCanvas} from './terminal-canvas';

export function createScrollable(component: BaseWidget) {
  const comp = createBase();
  comp.config({});
  const {r, s} = comp;

  const canvas = createTerminalCanvas();
  r('configChange', s.configChange.pipe(
    rx.map(cfg => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const obj = [...cfg.values()].reduce((obj, key) => {
        obj[key] = s.opts[key];
        return obj;
      }, {} as Record<string, any>);
      canvas.config(obj);
    })
  ));
  r('querySizeOf', s.pt.querySizeOf.pipe());
  r('component.preferredSize', component.table.l.preferredSize.pipe(
    rx.map(([m, w, h]) => {
      s.ft.preferredSize(w, h).dp(m);
    })
  ));
  s.ft.preferredSize(2, 2).dp();
  return comp;
}
