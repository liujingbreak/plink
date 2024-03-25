const rx = require('rxjs');

const a$ = new rx.Subject();

a$.pipe(rx.groupBy(a => a.k),
  rx.mergeMap(grouped$ => {
    console.log('new group', grouped$.key);
    return grouped$.pipe(
      rx.takeWhile(a => a.cmd !== 'stop'),
      rx.tap(a => {
        console.log(a);
      })
    );
  }),
).subscribe();

a$.next({k: 2, value: 1});
a$.next({k: 1, value: 2});
a$.next({k: 2, value: 3, cmd: 'stop'});
a$.next({k: 2, value: 4});
a$.next({k: 1, value: 5});

