import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {TerminalCanvas} from './terminal-canvas';

export type RenderFn = (canvas: TerminalCanvas, absTransform: mat4) => unknown;
interface TwInput {
  setTransform(mat: mat4): SingleActionFactory;
  addChild(...children: (TerminalWidget | RenderFn)[]): SingleActionFactory;
  removeChild(...children: (TerminalWidget | RenderFn)[]): SingleActionFactory;
  setParent(p: TerminalWidget): SingleActionFactory;
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  setSize(width: number): SingleActionFactory;
}

interface TwOutput {
  rendered(): SingleActionFactory;
  renderChild(index: number, child: RenderFn | TerminalWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  allChildren(children: Iterable<TerminalWidget | RenderFn>): SingleActionFactory;
  preferSize(width: number): SingleActionFactory;
}

const tableFor = ['setParent', 'allChildren', 'setTransform', 'setSize', 'preferSize'] as const;
export type TerminalWidget = SimplexReactor<TwInput & TwOutput, typeof tableFor>;

export function createWidget() {
  const service = new SimplexReactor<TwInput & TwOutput, typeof tableFor>({
    tableFor
  });
  const {r, s} = service;
  const children = [] as (RenderFn | TerminalWidget)[];

  r('addChild -> child.setParent', s.pt.addChild.pipe(
    rx.map(([m, ...added]) => {
      children.push(...added);
      for (const child of children) {
        if ((child as TerminalWidget).s)
          (child as TerminalWidget).s.ft.setParent(service).dp(m);
      }
    })
  ));

  r('render -> renderChild, rendered', s.pt.render.pipe(
    rx.withLatestFrom(s.pt.setTransform),
    rx.map(([[m, canvas, pTrans], [, trans]]) => {
      const absTrans = mat4.mul(mat4.create(), pTrans, trans);
      for (let i = 0, l = children.length; i < l; i++) {
        const chr = children[i];
        s.ft.renderChild(i, chr, canvas, absTrans).dp(m);
      }
      s.ft.rendered().dp(m);
    })
  ));
  r('renderChild -> child.render', s.pt.renderChild.pipe(
    rx.map(([m, _index, chr, canvas, trans]) => {
      if ((chr as TerminalWidget).s)
        (chr as TerminalWidget).s.ft.render(canvas, trans).re(m).dp();
      else
        (chr as RenderFn)(canvas, trans);
    })
  ));
  s.ft.allChildren(children).dp();
  s.ft.setTransform(mat4.create()).dp();
  return service;
}

