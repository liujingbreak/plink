import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

let animateCounter = 0;

const animFrameTimer$ = new rx.Observable<number>(sub => {
  let keep = true;
  requestAnimationFrame(frame);

  function frame(time: number) {
    sub.next(time);
    if (keep && animateCounter > 0)
      requestAnimationFrame(frame);
  }
  return () => {keep = false; };
}).pipe(
  op.share()
);

const startAnimate$ = new rx.Subject();
const stopAnimate$ = new rx.Subject();

rx.merge(
  startAnimate$.pipe(
    op.map(() => animateCounter++),
    op.exhaustMap(() => animFrameTimer$.pipe(
      op.takeWhile(() => animateCounter > 0)
    ))
  ),
  stopAnimate$.pipe(
    op.map(() => {
      animateCounter--;
    })
  )
).subscribe();

export function startAnim() {
  startAnimate$.next();
}

export function stopAnim() {
  stopAnimate$.next();
}
