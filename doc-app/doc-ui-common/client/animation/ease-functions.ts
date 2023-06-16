/**
 * https://devdocs.io/css/transition-timing-function
 */
import bezierEasing from 'bezier-easing';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export const ease = bezierEasing(0.25, 0.1, 0.25, 1);

export const easeIn = bezierEasing(0.42, 0, 1.0, 1);

export const easeOut = bezierEasing(0, 0, 0.58, 1);

export const easeInOut = bezierEasing(0.42, 0, 0.58, 1);

export function linear(input: number) {
  return input;
}

export {bezierEasing};

/**
 * 
 * @param animFrameTime$ typically should be the "time" parameter of callback parameter of requestAnimationFrame()
 * @param startValue the start boundary of animating value range
 * @param endValue the end boundary of animating value range (included)
 * @param durationMSec animation duration in millisecond
 * @param timingFuntion 
 * @returns Observable of changing value
 */
export function animate(startValue: number, endValue: number, durationMSec: number,
  timingFuntion: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' = 'ease', animFrameTime$: rx.Observable<number> = createAnimFrameTimer())
  : rx.Observable<number> {

  let timingFn: (input: number) => number;
  switch (timingFuntion) {
    case 'ease':
      timingFn = ease;
      break;
    case 'ease-in':
      timingFn = easeIn;
      break;
    case 'ease-out':
      timingFn = easeOut;
      break;
    case 'ease-in-out':
      timingFn = easeInOut;
      break;
    default:
      timingFn = linear;
      break;
  }

  const deltaValue = endValue - startValue;
  return animFrameTime$.pipe(
    op.take<number>(1),
    op.switchMap(initTime => {
      let progress = 0;

      return rx.concat(
        animFrameTime$.pipe(
          op.filter(time => time > initTime),
          op.map(time => {
            progress = (time - initTime) / durationMSec;
            // console.log(time - initTime, progress);
            const currValue = progress > 1 ? endValue : startValue + deltaValue * timingFn(progress);
            return currValue;
          }),
          op.takeWhile(() => progress <= 1)
        ),
        rx.of(endValue)
      );
    })
  );
}

export function createAnimFrameTimer() {
  return new rx.Observable<number>(sub => {
    let stop = false;
    function run() {
      requestAnimationFrame(time => {
        sub.next(time);
        if (!stop) {
          run();
        }
      });
    }

    run();
    return () => {stop = true; };
  });
}
