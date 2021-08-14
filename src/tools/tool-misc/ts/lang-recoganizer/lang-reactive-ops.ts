import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

interface CacheAndReplayState<T> {
  cacheData: T[];
  cacheStartPos: number;
  markIdices: number[];
  inputValue?: T;
  inputIdx: number;
}

export function cacheAndReplay<T>(markAction: rx.Observable<unknown>, replayAction: rx.Observable<unknown>,
  unmarkAction: rx.Observable<unknown>) {
  const store = new rx.BehaviorSubject<CacheAndReplayState<T>>({
    cacheData: [],
    cacheStartPos: -1,
    markIdices: [],
    inputIdx: -1
  });

  const replayer = new rx.Subject<{value: T; idx: number}>();

  return (input: rx.Observable<T>) => {
    const unsubscribeSubj = new rx.Subject();
    // handle mark action
    markAction.pipe(
      op.mergeMap(() => store.pipe(
        op.distinctUntilChanged((a, b) => a.inputValue === b.inputValue),
        op.filter(state => state.inputValue != null),
        op.take(1)
      )),
      op.map(s => {
        if (s.markIdices.length === 0) {
          s.cacheStartPos = s.inputIdx;
          s.cacheData.push(s.inputValue!);
        }
        store.next({
          ...s,
          markIdices: s.markIdices.concat(s.inputIdx)
        });
      }),
      op.takeUntil(unsubscribeSubj)
    ).subscribe();

    // handle replay action
    replayAction.pipe(
      op.mergeMap(() => store.pipe(
        op.distinctUntilChanged((a, b) => a.markIdices === b.markIdices),
        op.filter(state => state.markIdices.length > 0),
        op.take(1)
      )),
      op.map(state => {
        const marker = state.markIdices[state.markIdices.length - 1];
        for (let i = marker - state.cacheStartPos, l = state.cacheData.length; i < l; i++) {
          const value = state.cacheData[i];
          replayer.next({value, idx: state.cacheStartPos + i});
        }
        store.next({...state});
      }),
      op.takeUntil(unsubscribeSubj)
    ).subscribe();

    unmarkAction.pipe(
      op.map(() => {
        const s = store.getValue();
        if (s.markIdices.length > 0) {
          s.markIdices.pop();
        }
        if (s.markIdices.length === 0) {
          s.cacheData.splice(0);
        }
        store.next({...s});
      }),
      op.takeUntil(unsubscribeSubj)
    ).subscribe();

    return rx.merge(
      replayer.pipe(op.observeOn(rx.queueScheduler)),
      input.pipe(
        op.map((item, idx) => {
          const state = store.getValue();
          if (state.markIdices.length > 0) {
            state.cacheData.push(item);
          }
          store.next({...state});
          return {value: item, idx};
        })
      )
    ).pipe(
      op.map((item) => {
        const state = store.getValue();
        state.inputIdx = item.idx;
        state.inputValue = item.value;
        store.next({...state});
        return item;
      }),
      op.finalize(() => {
        unsubscribeSubj.next();
        unsubscribeSubj.complete();
      })
    );
  };
}

export function test() {
  const marker = new rx.Subject();
  const replay = new rx.Subject();
  const unmarker = new rx.Subject();

  rx.range(1, 20).pipe(
    // op.take(20),
    cacheAndReplay(marker, replay, unmarker),
    op.map(({value, idx}, totalIndex) => {
      // eslint-disable-next-line no-console
      console.log(`(${totalIndex}) offset:${idx}, value: ${value}`);
      if (totalIndex === 5) {
        marker.next();
      }
      if (totalIndex === 8) {
        marker.next();
      }
      if (totalIndex === 10) {
        replay.next();
      }
      if (totalIndex === 15) {
        replay.next();
      }

    }),
    op.take(50)
  ).subscribe();
}
