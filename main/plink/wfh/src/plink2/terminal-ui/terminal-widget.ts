import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, defineParialSimplexReactor, TableOf, ActionsOf} from '@wfh/reactivizer';
import {conciseNocolorConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {TerminalCanvas} from './terminal-canvas';

export interface BaseWidgetActions {
  setSize(width: number, height: number): SingleActionFactory;
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  overflow(yes: boolean): SingleActionFactory;

  setParent(p: TerminalWidget | null): SingleActionFactory;
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
}
const tableForBase = ['setSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent'] as const;
export type BaseWidget = SimplexReactor<BaseWidgetActions, typeof tableForBase>;
export const applyBase = defineParialSimplexReactor<BaseWidgetActions, typeof tableForBase>(tableForBase);

export interface ContainerWidgetInput {
  addChild<I extends BaseWidgetActions, L extends typeof tableForBase>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
  removeChild<I extends ActionsOf<BaseWidget>, L extends TableOf<BaseWidget>>(...children: SimplexReactor<I, L>[]): SingleActionFactory;
}

export interface ContainerWidgetOutput {
  renderSelf(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  allChildren(children: Array<BaseWidget>): SingleActionFactory;
}

const tableFor = ['allChildren'] as const;
export type TerminalWidget = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;

export function createWidget() {
  const service0 = new SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>({
    tableFor,
    log: conciseNocolorConsoleLogger
  });
  const service = applyBase(service0);
  const {r, s} = service;
  const children = [] as BaseWidget[];

  r('addChild -> child.setParent', s.pt.addChild.pipe(
    rx.map(([m, ...added]) => {
      children.push(...added);
      for (const child of children) {
        child.s.ft.setParent(service).dp(m);
      }
    })
  ));
  r('removeChild', s.pt.removeChild.pipe(
    rx.map(([, ...widgets]) => {
      for (const w of widgets) {
        const idx = children.findIndex(c => c === w);
        if (idx >= 0)
          children.splice(idx, 1);
      }
    })
  ));

  r('render -> renderSelf, renderChild, rendered', s.pt.render.pipe(
    rx.map(([m, canvas, trans]) => {
      s.ft.renderSelf(canvas, trans).dp(m);
      for (let i = 0, l = children.length; i < l; i++) {
        const chr = children[i];
        s.ft.renderChild(i, chr, canvas, trans).dp(m);
      }
    })
  ));
  r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(
    rx.map(([m, _index, chr, canvas, trans]) => {
      chr.s.ft.render(canvas, trans).re(m).dp();
    })
  ));
  s.ft.allChildren(children).dp();
  s.ft.setSize(0, 0).dp();
  s.ft.preferredSize(0, 0).dp();
  s.ft.setParent(null).dp();
  s.ft.overflow(false).dp();
  return service;
}

