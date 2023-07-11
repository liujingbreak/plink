import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import Color from 'color';
import {compose, scale, rotate} from 'transformation-matrix';
import {PaintableCtl, PaintableState, createPaintable, ReactiveCanvas2Control} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2';
import {parentChange$, alignToParent} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/paintable-utils';
import {colorToRgbaStr, createBezierArch, Segment, transSegments, drawSegmentPath, reverseSegments} from '@wfh/doc-ui-common/client/graphics/canvas-utils';

type ExtendActions = {
  changeDetectables(segIts: Iterable<Segment[]>): void;
  startOpeningAnim(animate$: rx.Observable<number>): void;
  openAnimateStopped(): void;
};

export function createHueCircle(root: PaintableCtl, rootState: PaintableState, _canvasCtl: ReactiveCanvas2Control) {

  const [huePaletteCtrl, huePaletteState] = createPaintable<ExtendActions>({debug: 'huePalette'});

  const {dispatcher, actionOfType: aot, payloadByType: pt} = huePaletteCtrl;
  dispatcher.attachTo(root, rootState);
  dispatcher.setProp({
    relativeWidth: 0.4,
    relativeHeight: 0.4
  });
  const {shapeChange$} = createPaintingObjects(huePaletteCtrl);
  let scaleRatio = 1;
  const transformedSegs = [] as Segment[][];
  const detectables = [] as Segment[][];
  const bounds = [] as Segment[][];
  let detectablesLen = 0;

  return rx.merge(
    alignToParent(huePaletteCtrl, huePaletteState),
    new rx.Observable(sub => {
      dispatcher.putTransformOperator( 'scale',
        matrix$ => matrix$.pipe(
          op.map(m => compose(m, scale(scaleRatio)))
        )
      );
      sub.complete();
    }),

    rx.concat(
      rx.of({payload: [huePaletteState.width, huePaletteState.height] as const}),
      aot('onResize')
    ).pipe(
      op.tap(({payload: [w, h]}) => {
        const size = Math.min(w, h);
        scaleRatio = size;
        dispatcher.setTransformDirty(true);
      })
    ),

    // When `transform` is newly changed or objects are changed, transform painting objects
    rx.combineLatest(
      pt.transformChanged,
      shapeChange$
    ).pipe(
      op.map(([, shapes]) => {
        let i = 0;
        for (const [, segs] of shapes) {
          detectables[i] = transformedSegs[i++] = [...transSegments(segs, huePaletteState.transform)];
        }
      })
    ),

    // Render content
    pt.renderContent.pipe(
      op.withLatestFrom(shapeChange$),
      op.map(([[ctx], shapes]) => {
        let i = 0;
        detectablesLen = shapes.length;
        for (const segs of transformedSegs) {
          ctx.fillStyle = colorToRgbaStr(shapes[i++][0]);
          ctx.beginPath();
          drawSegmentPath(segs, ctx, {closed: true, round: true});
          ctx.closePath();
          ctx.fill();
        }
        for (const bound of bounds) {
          ctx.strokeStyle = 'black';
          ctx.beginPath();
          drawSegmentPath(bound, ctx, {closed: true, round: true});
          ctx.closePath();
          ctx.stroke();
        }
      })
    ),
    // start animation
    pt.renderContent.pipe(
      op.take(1),
      op.map(() => {dispatcher.startOpeningAnim(huePaletteState.animateMgr!.animate(0, 1, 500)); })
    ),
    // When animation is finished, ask web workers to perform bounds calculation
    pt.openAnimateStopped.pipe(
      op.withLatestFrom(shapeChange$),
      op.switchMap(() => rx.timer(300)),
      op.switchMap(() => rx.concat(
        rx.of(detectables),
        pt.transformChanged.pipe(op.mapTo(detectables))
      )),
      op.throttleTime(700, rx.asapScheduler, {leading: true, trailing: true}),
      op.map(detectables => {
        let i = 0;
        dispatcher.updateDetectables(
          (function* () {
            for (const segs of detectables.slice(0, detectablesLen))
              yield ['hue' + i++, segs];
          })()
        );
        return detectablesLen;
      }),
      // Make sure we wait until all bounds are finished calculation
      op.switchMap((num) => huePaletteState.workerClient!.payloadByType.doneTaskForKey.pipe(
        op.filter(([, paintableId]) => paintableId === huePaletteState.id),
        op.take(num),
        op.takeLast(1)
      )),
      op.map(() => {
        bounds.splice(0);
        huePaletteState.workerClient?.dispatcher.getBBoxesOf(huePaletteState.id);
      })
    ),
    // Use workerClient "gotBBoxesOf" to retrieve bounding boxes.
    // huePaletteState.workerClient is availabe when `parentChange$()` is dispatched
    parentChange$(huePaletteCtrl, huePaletteState).pipe(
      op.switchMap(() => {
        const ppt = huePaletteState.workerClient?.payloadByType;
        if (ppt == null)
          return rx.EMPTY;

        return ppt.gotBBoxesOf.pipe(
          op.filter(([, paintableId]) => paintableId === huePaletteState.id),
          op.map(([, , rects], idx) => {
            for (const rect of rects) {
              bounds.push([
                new Segment([rect.x, rect.y]),
                new Segment([rect.x + rect.w, rect.y]),
                new Segment([rect.x + rect.w, rect.y + rect.h]),
                new Segment([rect.x, rect.y + rect.h])
              ]);
            }
            // console.log(bounds.map(segs => segs.slice(0, 1).map(seg => seg.point)));
            huePaletteState.animateMgr?.renderFrame$.next();
          })
        );
      })
    )
  );
}

function createPaintingObjects(ctrl: PaintableCtl<ExtendActions>) {
  const numOfColors = 36;
  const fanShapes = [] as [color: Color, segsIt: Iterable<Segment>][];

  const init$ = rx.defer(() => {
    const archRatio = 1 / (numOfColors / 4) + 1 / 32;  // Add 1/32 to make each piece a lit bit bigger to overlop on each other, so that avoid T-joint issue

    const angle = Math.PI * 2 / numOfColors;
    const angleDeg = 360 / numOfColors;
    const curveSegs = createBezierArch(0, archRatio);
    const smallCurveSegs = [...transSegments(curveSegs, scale(0.7))];
    const shape = [...reverseSegments(smallCurveSegs), ...curveSegs];

    for (let i = 0; i < numOfColors; i++) {
      const rotatedShape = Array.from(transSegments(shape, rotate(-angle * i)));
      fanShapes[i] = [
        new Color().hue(angleDeg * i).lightness(50)
          .saturationl(70),
        rotatedShape
      ];
    }
    return rx.EMPTY;
  });

  return {
    shapeChange$: rx.concat(
      init$,
      ctrl.payloadByType.startOpeningAnim.pipe(
        op.switchMap(progress$ => progress$.pipe(
          op.map(value => {
            const fShowNumColorsF = numOfColors * value;
            const iShowNumColors = Math.floor(fShowNumColorsF);
            const partialShape = fShowNumColorsF - iShowNumColors;
            const showShapes = fanShapes.slice(0, iShowNumColors < numOfColors ? iShowNumColors + 1 : numOfColors).map(entry => [...entry] as typeof entry);
            if (partialShape > 0) {
              const shape = showShapes[showShapes.length - 1];
              shape[0] = shape[0].alpha(partialShape);
            }
            return showShapes;
          }),
          op.finalize(() => ctrl.dispatcher.openAnimateStopped())
        ))
      )
    ).pipe(
      op.share()
    )
  };
}
