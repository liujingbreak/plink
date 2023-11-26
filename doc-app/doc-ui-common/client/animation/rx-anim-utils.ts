import * as rx from 'rxjs';

/**
 * Like switchMap(), projects each source value to an Observable which is merged in the output Observable, but
 * emit the current one and the values from the most recent subsequent projected.
 * - If the current projected inner observable (denoted as A$) has not completed, subsequent project observable (denoted as B$)
 *   has to wait for being subscribed
 * - If there more subsequent projected observable "C$", "B$" will be "switched from" (cancelled), the
 * most recent "C$" will take its place and waiting for A$ complete
 * 
 * It is useful when there are a sequence of animations, the current on-going animation will continue to play, but the next unstarted
 * animation will be replaced by even more recent animation in waiting queue
 *
 */
export function switchWaitingMap<T, R>(mapFn: (value: T, index: number) => rx.ObservableInput<R>) {
  return function(input$: rx.Observable<T>) {
    const lock$ = new rx.BehaviorSubject<boolean>(false);
    const onFinal$ = new rx.Subject<void>();
    return input$.pipe(
      rx.switchMap((value, idx) => lock$.pipe(
        rx.filter(locked => !locked),
        rx.take(1),
        rx.tap(() => {
          lock$.next(true);
          // this observable will not be "cancelled" by outer switchMap()
          rx.defer(() => mapFn(value, idx)).pipe(
            rx.finalize(() => {
              lock$.next(false);
            }),
            rx.takeUntil(onFinal$)
          ).subscribe();
        })
      )),
      rx.finalize(() => {
        onFinal$.next();
        onFinal$.complete();
      })
    );
  };
}
