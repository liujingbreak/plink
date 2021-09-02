import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

interface CacheAndReplayState<T> {
  cacheData: T[];
  cacheStartPos: number;
  // markIdices: LinkedList<{offset: number; laNum: number}>;
  unmarkPositions: Set<number>;
  inputValue?: T;
  inputIdx: number;
}

export function cacheAndReplay<T>(
  markAction: rx.Observable<number>, // with offset of look ahead
  replayAction: rx.Observable<number> // with target marked position
) {
  const store = new rx.BehaviorSubject<CacheAndReplayState<T>>({
    cacheData: [],
    cacheStartPos: -1,
    // markIdices: new LinkedList<{offset: number; laNum: number}>(),
    unmarkPositions: new Set<number>(),
    inputIdx: -1
  });

  const replayer = new rx.Subject<{value: T; idx: number}>();

  return (input: rx.Observable<T>) => {
    const unsubscribeSubj = new rx.Subject();
    // handle mark action
    markAction.pipe(
      op.mergeMap(laNumber => store.pipe(
        op.distinctUntilChanged((a, b) => a.inputValue === b.inputValue),
        op.filter(state => state.inputValue != null),
        op.take(1),
        op.map(s => {
          if (s.unmarkPositions.size === 0) {
            s.cacheStartPos = s.inputIdx;
            s.cacheData.push(s.inputValue!);
          }
          // s.markIdices.add({offset: s.inputIdx, laNum: laNumber});
          s.unmarkPositions.add(laNumber + s.inputIdx);
          store.next({
            ...s
          });
        })
      )),
      op.takeUntil(unsubscribeSubj)
    ).subscribe();

    // handle replay action
    replayAction.pipe(
      op.mergeMap((position) => store.pipe(
        op.distinctUntilChanged((a, b) => a.cacheStartPos === b.cacheStartPos),
        op.filter(state => state.cacheStartPos >= 0),
        op.take(1),
        op.map(state => {
          for (let i = position - state.cacheStartPos, l = state.cacheData.length; i < l; i++) {
            const value = state.cacheData[i];
            replayer.next({value, idx: state.cacheStartPos + i});
          }
          store.next({...state});
        })
      )),
      op.takeUntil(unsubscribeSubj)
    ).subscribe();

    // unmarkAction.pipe(
    //   op.map(() => {
    //     const s = store.getValue();
    //     if (s.markIdices.length > 0) {
    //       s.markIdices.pop();
    //     }
    //     if (s.markIdices.length === 0) {
    //       s.cacheData.splice(0);
    //     }
    //     store.next({...s});
    //   }),
    //   op.takeUntil(unsubscribeSubj)
    // ).subscribe();

    return rx.merge(
      replayer.pipe(op.observeOn(rx.queueScheduler)),
      input.pipe(
        op.map((item, idx) => {
          const state = store.getValue();
          if (state.unmarkPositions.has(idx)) {
            // console.log('unmark', state.unmarkPositions.size);
            state.unmarkPositions.delete(idx);
            if (state.unmarkPositions.size === 0) {
              state.cacheData.splice(0);
            }
          }
          if (state.unmarkPositions.size > 0) {
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
  const marker = new rx.Subject<number>();
  const replay = new rx.Subject<number>();

  rx.range(0, 20).pipe(
    // op.take(20),
    cacheAndReplay(marker, replay),
    op.map(({value, idx}, totalIndex) => {
      // eslint-disable-next-line no-console
      console.log(`(${totalIndex}) offset:${idx}, value: ${value}`);
      if (totalIndex === 5) {
        marker.next(4);
      }
      if (totalIndex === 8) {
        marker.next(2);
      }
      if (totalIndex === 10) {
        replay.next(8);
      }
      if (totalIndex === 15) {
        replay.next(5);
      }

    }),
    op.take(50)
  ).subscribe();
}
