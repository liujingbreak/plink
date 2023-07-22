import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import Color from 'color';
import {compose, scale, rotate} from 'transformation-matrix';
import {PaintableCtl, Paintable, createPaintable} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2';
import {alignToParent} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/paintable-utils';
import {colorToRgbaStr, createBezierArch, Segment, transSegments, drawSegmentPath, reverseSegments,
  concatSegments} from '@wfh/doc-ui-common/client/graphics/canvas-utils';

type ExtendActions = {
  setAuxiliaryEnabled(enabled: boolean): void;
  render(ctx: CanvasRenderingContext2D): void;
  changeDetectables(segIts: Iterable<Segment[]>): void;
  startOpeningAnim(animate$: rx.Observable<number>): void;
  openAnimateStopped(): void;
};

export function createHueCircle(root: Paintable) {

  const basePaintable = createPaintable({debug: 'huePalette'});
  const [huePaletteCtrl, , {attached$}] = basePaintable;

  const {dispatcher} = huePaletteCtrl;
  // const {shapeChange$, centerSphere} = createPaintingObjects(huePaletteCtrl);

  dispatcher.addEpic<ExtendActions>((ctrl, huePaletteState) => {
    const {dispatcher, actionOfType: aot, payloadByType: pt} = ctrl;
    let scaleRatio = 1;
    const transformedSegs = [] as Segment[][];
    const detectables = [] as Segment[][];
    const bounds = [] as Segment[][];
    let cursorPointer: [number, number] | undefined;
    let detectablesLen = 0;
    let selectedColor: string | undefined;
    const {shapeChange$, centerSphere} = createPaintingObjects(ctrl);
    let transformedCenterSphere: Segment[] = centerSphere;

    return rx.merge(
      alignToParent(basePaintable),

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
        op.map(([m, shapes]) => {
          let i = 0;
          for (const [, segs] of shapes) {
            detectables[i] = transformedSegs[i++] = [...transSegments(segs, m)];
          }
        })
      ),

      pt.transformChanged.pipe(
        op.map(m => {
          transformedCenterSphere = [...transSegments(centerSphere, m)];
        })
      ),

      // Render content
      pt.renderContent.pipe(
        op.map(([ctx, _baseState]) => ctx),
        op.withLatestFrom(shapeChange$),
        op.map(([ctx, fanShapes]) => {
          let i = 0;
          detectablesLen = fanShapes.length;
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

          if (selectedColor) {
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = selectedColor;
            drawSegmentPath(transformedCenterSphere, ctx, {closed: true, round: true});
            ctx.closePath();
            ctx.fill();
          }
        })
      ),

      attached$().pipe(
        op.mergeMap(([state]) => {
          const {workerClient, animateMgr} = state.canvasEngine;
          return rx.merge(
            // start animation
            pt.afterRender.pipe(
              op.take(1),
              op.map(() => {dispatcher.startOpeningAnim(animateMgr.animate(0, 1, 500)); })
            ),
            workerClient.payloadByType.detectedIntersection.pipe(
              op.withLatestFrom(pt.setAuxiliaryEnabled, shapeChange$),
              op.map(([[segsKeys, cursorArr], auxiliary, hueShapes]) => {
                // eslint-disable-next-line no-console
                console.log('select:', segsKeys);
                if (segsKeys.length === 0)
                  return;
                const hueKey = segsKeys[segsKeys.length - 1].split('/')[1];
                const hueIndex = Number(hueKey.slice('hue'.length));
                selectedColor = colorToRgbaStr(hueShapes[hueIndex][0]);

                if (auxiliary) {
                  cursorPointer = [Math.round(cursorArr[0]), Math.round(cursorArr[1])];
                }
                animateMgr.requestSingleFrame();
              })
            ),
            // When animation is finished, ask web workers to perform bounds calculation
            pt.openAnimateStopped.pipe(
              op.withLatestFrom(shapeChange$),
              op.switchMap(() => rx.timer(300)),
              op.switchMap(() => rx.concat(
                rx.of(detectables),
                pt.transformChanged.pipe(op.mapTo(detectables))
              )),
              op.debounceTime(300, rx.asapScheduler),
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
              // Make sure we wait until all bounds are finished calculated
              op.switchMap(num => workerClient.payloadByType.doneTaskForKey.pipe(
                op.filter(([, paintableId]) => paintableId === huePaletteState.id),
                op.take(num),
                op.takeLast(1)
              )),
              op.map(() => {
                bounds.splice(0);
                workerClient.dispatcher.getBBoxesOf(huePaletteState.id);
              })
            )
          );
        })
      ),
      // Use workerClient "gotBBoxesOf" to retrieve bounding boxes.
      // huePaletteState.workerClient is availabe when `parentChange$()` is dispatched
      pt.setAuxiliaryEnabled.pipe(
        op.distinctUntilChanged(),
        op.switchMap(auxiliary => {
          if (auxiliary) {
            return attached$();
          } else {
            return rx.of([] as const);
          }
        }),
        op.switchMap(([state]) => {
          if (state == null)
            return rx.EMPTY;
          const {animateMgr, workerClient} = state.canvasEngine;
          return workerClient.payloadByType.gotBBoxesOf.pipe(
            op.filter(([, paintableId]) => paintableId === huePaletteState.id),
            op.map(([, , rects]) => {
              for (const rect of rects) {
                bounds.push([
                  new Segment([rect.x, rect.y]),
                  new Segment([rect.x + rect.w, rect.y]),
                  new Segment([rect.x + rect.w, rect.y + rect.h]),
                  new Segment([rect.x, rect.y + rect.h])
                ]);
              }
              // console.log(bounds.map(segs => segs.slice(0, 1).map(seg => seg.point)));
              animateMgr.requestSingleFrame();
            })
          );
        })
      ),
      // Emit some initial actions
      rx.defer(() => {
        dispatcher.putTransformOperator( 'scale',
          matrix$ => matrix$.pipe(
            op.map(m => compose(m, scale(scaleRatio)))
          )
        );
        createPaintingObjects(ctrl);
        dispatcher.attachTo(root);
        dispatcher.setAuxiliaryEnabled(false);
        dispatcher.setProp({
          relativeWidth: 0.4,
          relativeHeight: 0.4
        });
      })
    );
  });
}

const COMPLEMENT = 0.01; // make object a little bigger to conque T-edge issue

function createPaintingObjects(ctrl: PaintableCtl<ExtendActions>) {
  const numOfColors = 6;
  const fanShapes = [] as [color: Color, segsIt: Iterable<Segment>][];

  const init$ = rx.defer(() => {
    const archRatio = 1 / (numOfColors / 4) * (1 + COMPLEMENT); // Add 1/32 to make each piece a lit bit bigger to overlop on each other, so that avoid T-joint issue

    const angle = Math.PI * 2 / numOfColors;
    const angleDeg = 360 / numOfColors;
    const curveSegs = createBezierArch(0, archRatio);
    const smallCurveSegs = [...transSegments(curveSegs, scale(0.7))];
    const shape = [...reverseSegments(smallCurveSegs), ...curveSegs];

    const angleCompl = COMPLEMENT * angle / 2;
    for (let i = 0; i < numOfColors; i++) {
      const rotatedShape = Array.from(transSegments(shape, rotate(-angle * i + angleCompl)));
      fanShapes[i] = [
        new Color().hue(angleDeg * i).lightness(50)
          .saturationl(70),
        rotatedShape
      ];
    }
    return rx.EMPTY;
  });

  const quarterSphere = createBezierArch(0, 1);
  let centerSphere = concatSegments([...quarterSphere as Segment[],
    ...transSegments(quarterSphere as Segment[], rotate(Math.PI * 3 / 2)),
    ...transSegments(quarterSphere as Segment[], rotate(Math.PI)),
    ...transSegments(quarterSphere as Segment[], rotate(Math.PI / 2))
  ]);
  centerSphere = [...transSegments(centerSphere, scale(0.705))];

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
    ),

    centerSphere
  };
}
