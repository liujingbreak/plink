import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {TerminalCanvas} from './terminal-canvas';

/** A pristine single line text rendable unit */
export type StaticTextLabel = {
  text: string;
  displayLength: number;
  width?: number;
};
interface TwInput {
  setTransform(mat: mat4): SingleActionFactory;
  addChild(...children: (TerminalWidget | StaticTextLabel)[]): SingleActionFactory;
  removeChild(...children: (TerminalWidget | string)[]): SingleActionFactory;
  setParent(p: TerminalWidget): SingleActionFactory;
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  setSize(width: number, height: number): SingleActionFactory;
}

interface TwOutput {
  rendered(): SingleActionFactory;
  renderChild(index: number, child: StaticTextLabel | TerminalWidget, canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  allChildren(children: Array<TerminalWidget | StaticTextLabel>): SingleActionFactory;
  preferredSize(width: number, height: number): SingleActionFactory;
  resized(width: number, height: number): SingleActionFactory;
}

const tableFor = ['setParent', 'allChildren', 'setTransform', 'setSize', 'preferredSize'] as const;
export type TerminalWidget = SimplexReactor<TwInput & TwOutput, typeof tableFor>;

export function createWidget() {
  const service = new SimplexReactor<TwInput & TwOutput, typeof tableFor>({
    tableFor
  });
  const {r, s} = service;
  const children = [] as (StaticTextLabel | TerminalWidget)[];

  r('addChild -> child.setParent', s.pt.addChild.pipe(
    rx.map(([m, ...added]) => {
      children.push(...added);
      for (const child of children) {
        if ((child as TerminalWidget).s)
          (child as TerminalWidget).s.ft.setParent(service).dp(m);
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
  r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(
    rx.map(([m, _index, chr, canvas, trans]) => {
      if (isStaticTextLabel(chr)) {
        const vec = vec2.create();
        vec2.transformMat4(vec, vec, trans);
        canvas.s.ft.addString(vec[0], vec[1], chr.text).dp(m);
      } else {
        chr.s.ft.render(canvas, trans).re(m).dp();
      }
    })
  ));
  s.ft.allChildren(children).dp();
  s.ft.setTransform(mat4.create()).dp();
  s.ft.setSize(0, 0).dp();
  s.ft.preferredSize(0, 0).dp();
  return service;
}

export function isStaticTextLabel(obj: any): obj is StaticTextLabel {
  return (obj as StaticTextLabel).displayLength != null && (obj as StaticTextLabel).text != null;
}

