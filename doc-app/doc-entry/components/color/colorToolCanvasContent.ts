import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import Color from 'color';
import {mat4} from 'gl-matrix';
import {Paintable, createPaintable} from '@wfh/doc-ui-common/client/graphics/canvas';
import {ReactiveCanvas2Engine} from '@wfh/doc-ui-common/client/graphics/canvas/reactiveCanvas2.worker';
import {alignToParent2d} from '@wfh/doc-ui-common/client/graphics/canvas/paintable-utils';
import {colorToRgbaStr, createBezierArch, Segment, transSegments3d, drawSegmentPath, reverseSegments
} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {transformVertexArr, cloneSegmentIndexed, createCircleCurve, drawSegmentIndexedPath} from '@wfh/doc-ui-common/client/graphics/canvas';

type ExtendActions = {
  setAuxiliaryEnabled(enabled: boolean): void;
  startOpeningAnim(animate$: rx.Observable<number>): void;
  _calCenterOfFanShape(segs: Iterable<Segment>): void;
};

type ExtendEvents = {
  openAnimateStopped(): void;
};

const inputTableFor = ['setAuxiliaryEnabled'] as const;

export function createHueCircle(root: Paintable, {animateMgr, canvasController}: ReactiveCanvas2Engine) {
  const composite = createPaintable<ExtendActions, ExtendEvents, typeof inputTableFor>({name: 'huePalette', inputTableFor});

  const {i, o, r} = composite;
  const {dp} = i;
  let scaleRatio = 1;
  const transformedSegs = [] as Segment[][];
  const detectables = [] as Segment[][];
  const bounds = [] as Segment[][];
  let cursorPointer: [number, number] | undefined;
  let selectedColor = new Color().alpha(0);
  let animSelectedColor: string | undefined;
  const {shapeChange$, centerSphere} = createPaintingObjects(composite);
  const transformedCenterSphere = cloneSegmentIndexed(centerSphere);

  // const {shapeChange$, centerSphere} = createPaintingObjects(composite);
  alignToParent2d(composite);

  dp.putTransformOperator('scale',
    matrix$ => matrix$.pipe(
      op.map(m => mat4.mul(mat4.create(), m, mat4.fromScaling(mat4.create(), [scaleRatio, scaleRatio, 1])))
    )
  );
  dp.setRelativeSize(0.4, 0.4);
  dp.setAuxiliaryEnabled(false);
  dp.attachTo(root);

  r('synce size', rx.merge(o.pt.onResize, i.pt.setSize).pipe(
    rx.tap(([m, w, h]) => {
      const size = Math.min(w, h);
      scaleRatio = size;
      o.dpf.setTransformDirty(m, true);
    })
  ));

  // When `transform` is newly changed or objects are changed, transform painting objects
  r('on shape and transform changes', rx.combineLatest([o.pt.setAbsoluteTransform, shapeChange$]).pipe(
    rx.map(([[, transform], shapes]) => {
      let i = 0;
      for (const [, segs] of shapes) {
        detectables[i] = transformedSegs[i++] = [...transSegments3d(segs, transform)];
      }
    })
  ));

  r('on transform changes', o.pt.setAbsoluteTransform.pipe(
    op.map(([, mat]) => {
      transformVertexArr(transformedCenterSphere[0].vertexArray, centerSphere[0].vertexArray, mat);
    })
  ));

  r('renderContent', o.pt.renderContent.pipe(
    rx.withLatestFrom(shapeChange$),
    rx.map(([[, ctx], fanShapes]) => {
      let i = 0;
      // detectablesLen = fanShapes.length;
      for (const segs of transformedSegs) {
        ctx.fillStyle = colorToRgbaStr(fanShapes[i++][0]);
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

      if (cursorPointer) {
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.moveTo(cursorPointer[0], cursorPointer[1]);
        ctx.beginPath();
        ctx.arc(cursorPointer[0], cursorPointer[1], 4, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (animSelectedColor) {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = animSelectedColor;
        drawSegmentIndexedPath(transformedCenterSphere, ctx, {closed: true});
        ctx.closePath();
        ctx.fill();
      }
    })
  ));

  r('afterRender', o.at.afterRender.pipe(
    rx.take(1),
    rx.map(() => {dp.startOpeningAnim(animateMgr.animate(0, 1, 500)); })
  ));

  r('onSegmentsClicked', canvasController.o.pt.onSegmentsClicked.pipe(
    rx.withLatestFrom(composite.inputTable.l.setAuxiliaryEnabled, shapeChange$),
    rx.map(([[, segsKeys, cursorArr], [, auxiliary], hueShapes]) => {
      // eslint-disable-next-line no-console
      console.log('select:', segsKeys);
      if (segsKeys.length === 0)
        return;
      const hueKey = segsKeys[segsKeys.length - 1].split('/')[1];
      const hueIndex = Number(hueKey.slice('hue'.length));

      if (auxiliary) {
        cursorPointer = [Math.round(cursorArr[0]), Math.round(cursorArr[1])];
      }
      // animateMgr.requestSingleFrame();
      return hueShapes[hueIndex][0];
    }),
    op.filter((res): res is NonNullable<typeof res> => res != null),
    op.concatMap(targetColor => animateMgr.animate(0, 1, 300, 'linear').pipe(
      op.map(t => {
        const animatedColor = selectedColor.mix(targetColor, t);
        animSelectedColor = colorToRgbaStr(animatedColor);
        return animatedColor;
      }),
      op.takeLast(1),
      op.map(targetColor => {
        selectedColor = targetColor;
      })
    ))
  ));

  // When animation is finished, ask web workers to perform bounds calculation
  /*
  r(o.at.openAnimateStopped.pipe(
    op.withLatestFrom(shapeChange$),
    op.switchMap(() => rx.timer(300)),
    op.switchMap(() => rx.concat(
      rx.of(detectables),
      o.pt.setAbsoluteTransform.pipe(op.map(() => detectables))
    )),
    op.debounceTime(300, rx.asapScheduler),
    op.map(detectables => {
      let i = 0;
      dp.updateDetectables(
        (function* () {
          for (const segs of detectables.slice(0, detectablesLen))
            yield ['hue' + i++, segs];
        })()
      );
      return detectablesLen;
    }),
    // Make sure we wait until all bounds are finished calculated
    op.switchMap(num => workerClient.o.pt.doneTaskForKey.pipe(
      op.filter(([, , paintableId]) => paintableId === state.id),
      op.take(num),
      op.takeLast(1)
    )),
    op.map(() => {
      bounds.splice(0);
      workerClient.i.dp.getBBoxesOf(state.id);
    })
  ));
  */

  // pt._calCenterOfFanShape.pipe(
  //   op.mergeMap(segs => attached$().pipe(
  //     op.map(([state]) => {
  //       const {workerClient} = state.canvasEngine;
  //       const id = Math.random() + '';
  //       workerClient.dp.calculateFaceCenter(id, [
  //         ...(function* () {
  //           for (const seg of segs) {
  //             yield seg.toNumbers();
  //           }
  //         })()
  //       ]);
  //     })
  //   ))
  // ),

  // Use workerClient "gotBBoxesOf" to retrieve bounding boxes.
  // huePaletteState.workerClient is availabe when `parentChange$()` is dispatched
  // pt.setAuxiliaryEnabled.pipe(
  //   op.distinctUntilChanged(),
  //   op.switchMap(enabled => {
  //     return enabled ?
  //       workerClient.payloadByType.gotBBoxesOf.pipe(
  //         op.filter(([, paintableId]) => paintableId === state.id),
  //         op.map(([, , rects]) => {
  //           for (const rect of rects) {
  //             bounds.push([
  //               new Segment([rect.x, rect.y]),
  //               new Segment([rect.x + rect.w, rect.y]),
  //               new Segment([rect.x + rect.w, rect.y + rect.h]),
  //               new Segment([rect.x, rect.y + rect.h])
  //             ]);
  //           }
  //           // console.log(bounds.map(segs => segs.slice(0, 1).map(seg => seg.point)));
  //           animateMgr.requestSingleFrame();
  //         })
  //       ) :
  //       rx.EMPTY;
  //   })
  // ),
}

const COMPLEMENT = Math.PI / 360; // make object a little bigger to conque T-edge issue

function createPaintingObjects(ctrl: Paintable<ExtendActions, ExtendEvents, typeof inputTableFor>) {
  const numOfColors = 36;
  const fanShapes = [] as [color: Color, segsIt: Iterable<Segment>][];

  const init$ = rx.defer(() => {

    const angle = Math.PI * 2 / numOfColors;
    const angleDeg = 360 / numOfColors;
    const shape = fanShapeGraphicsModel(numOfColors);
    ctrl.i.dp._calCenterOfFanShape(shape);

    const angleCompl = COMPLEMENT / 2;
    for (let i = 0; i < numOfColors; i++) {
      const rotatedShape = Array.from(transSegments3d(shape, mat4.fromZRotation(mat4.create(), -angle * i + angleCompl)));
      fanShapes[i] = [
        new Color().hue(angleDeg * i).lightness(50)
          .saturationl(70),
        rotatedShape
      ];
    }
    return rx.EMPTY;
  });

  // centerSphere shows the color when user clicks on one color "fan" shape
  const centerSphere = createCircleCurve();
  transformVertexArr(centerSphere[0].vertexArray, centerSphere[0].vertexArray, mat4.fromScaling(mat4.create(), [0.705, 0.705, 1]));

  return {
    shapeChange$: rx.concat(
      init$,
      ctrl.i.pt.startOpeningAnim.pipe(
        op.switchMap(([, progress$]) => progress$.pipe(
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
          op.finalize(() => ctrl.o.dp.openAnimateStopped())
        ))
      )
    ).pipe(
      op.share()
    ),

    centerSphere
  };
}

function fanShapeGraphicsModel(totalNumOfShapes: number, scale = 1, centerPoint?: [number, number]) {
  // Add 1/32 to make each piece a lit bit bigger to overlop on each other, so that avoid T-joint issue
  const archRatio = 1 / (totalNumOfShapes / 4) + COMPLEMENT;
  const curveSegs = createBezierArch(0, archRatio);
  const smallCurveSegs = [...transSegments3d(curveSegs, mat4.fromScaling(mat4.create(), [0.7, 0.7, 1]))];
  const shape = [...reverseSegments(smallCurveSegs), ...curveSegs];
  if (scale !== 1 && centerPoint) {
    const tempMat = mat4.create();
    const m = mat4.fromTranslation(tempMat, [...centerPoint, 0]);
    mat4.mul(m, m, mat4.fromScaling(tempMat, [scale, scale, 1]));
    mat4.mul(m, m, mat4.fromTranslation(tempMat, [-centerPoint[0], -centerPoint[1], 0]));
    return transSegments3d(shape, m);
  } else {
    return shape;
  }
}
