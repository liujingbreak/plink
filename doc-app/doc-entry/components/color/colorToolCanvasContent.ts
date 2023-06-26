import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import Color from 'color';
import {compose, scale, rotate} from 'transformation-matrix';
import {PaintableCtl, PaintableState, createPaintable, ReactiveCanvas2Control} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2';
import {alignToParent} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/paintable-utils';
import {animate} from '@wfh/doc-ui-common/client/animation/ease-functions';
import {createBezierArch, Segment, transSegments, drawSegmentPath, reverseSegments} from '@wfh/doc-ui-common/client/graphics/canvas-utils';

export function createHueCircle(root: PaintableCtl, rootState: PaintableState, canvasCtl: ReactiveCanvas2Control) {

  const [singleHueCtrl, singleHueState] = createPaintable();

  const {dispatcher, actionOfType: aot} = singleHueCtrl;
  dispatcher.attachTo(root, rootState);
  dispatcher.setProp({
    relativeWidth: 0.4,
    relativeHeight: 0.4
  });
  // dispatcher.setRelativeSize(0.4, 0.4);
  // dispatcher.setTouchDetection(true);
  const {setProgress, shapeChange$} = createPaintingObjects();
  let scaleRatio = 1;

  return rx.merge(
    alignToParent(singleHueCtrl, singleHueState),
    new rx.Observable(sub => {
      dispatcher.putTransformOperator( 'scale',
        matrix$ => matrix$.pipe(
          op.map(m => compose(m, scale(scaleRatio)))
        )
      );
      sub.complete();
    }),

    rx.concat(
      rx.of({payload: [singleHueState.width, singleHueState.height] as const}),
      aot('onResize')
    ).pipe(
      op.tap(({payload: [w, h]}) => {
        const size = Math.min(w, h);
        scaleRatio = size;
        dispatcher.setTransformDirty(true);
      })
    ),

    aot('renderContent').pipe(
      op.withLatestFrom(shapeChange$),
      op.map(([{payload: [ctx, state]}, [shapes, colors]]) => {
        let i = 0;
        for (const segs of shapes) {
          const transformed = [...transSegments(segs, state.transform)];
          ctx.fillStyle = colors[i++];
          ctx.beginPath();
          drawSegmentPath(transformed, ctx, {closed: true, round: true});
          ctx.closePath();
          ctx.fill();
        }
      })
    ),
    aot('renderContent').pipe(
      op.take(1),
      op.switchMap(() => animate(0, 1, 1000, 'ease-out')),
      op.map(v => {
        setProgress(v);
      })
    )
  );
}

function createPaintingObjects() {
  const setProgress$ = new rx.Subject<number>();
  const dispatcher = new rx.Subject<[Iterable<Segment>[], string[]]>();

  const numOfColors = 48;
  const fanShapes = [] as Iterable<Segment>[];
  const colors: string[] = [];

  const shapeChange$ = rx.defer(() => {
    const archRatio = 1 / (numOfColors / 4) + 1 / 32;  // Add 1/32 to make each piece a lit bit bigger to overlop on each other, so that avoid T-joint issue

    const angle = Math.PI * 2 / numOfColors;
    const angleDeg = 360 / numOfColors;
    const curveSegs = createBezierArch(0, archRatio);
    const smallCurveSegs = [...transSegments(curveSegs, scale(0.7))];
    const shape = [...reverseSegments(smallCurveSegs), ...curveSegs];

    for (let i = 0; i < numOfColors; i++) {
      const rotatedShape = Array.from(transSegments(shape, rotate(-angle * i)));
      fanShapes[i] = rotatedShape;

      colors.push(new Color().hue(angleDeg * i).lightness(50)
        .saturationl(70)
        .toString());
    }
    return dispatcher;
  });

  return {
    setProgress(progress: number) {
      setProgress$.next(progress);
    },
    shapeChange$: rx.merge(
      shapeChange$,
      setProgress$.pipe(
        op.map(value => {
          const fShowNumColorsF = numOfColors * value;
          const iShowNumColors = Math.floor(fShowNumColorsF);
          const partialShape = fShowNumColorsF - iShowNumColors;
          const numOfShapes = iShowNumColors < numOfColors ? iShowNumColors : iShowNumColors + 1;
          const showShapes = fanShapes.slice(0, numOfShapes);
          const showColors = colors.slice(0, numOfShapes);
          if (partialShape > 0) {
            showColors[iShowNumColors - 1] = new Color(colors[iShowNumColors - 1]).alpha(partialShape).toString();
          }
          dispatcher.next([showShapes, showColors]);
        }),
        op.ignoreElements()
      )
    )
  };
}
