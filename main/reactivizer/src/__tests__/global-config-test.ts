/* eslint-disable no-console */
import assert from 'node:assert';
import * as rx from 'rxjs';
// import {ReactorComposite2} from '../reactor-composite';
// import {RxController2} from '../control2';
import {allRefs} from '../global-config';
const formater = new Intl.NumberFormat();

const NUM = process.argv[2] ? Number(process.argv[2]) : 3000;

let countReclaimed = 0;
let countRegistered = 0;
const onFinalize$ = new rx.Subject<number>();
export const reg = new FinalizationRegistry<string>(() => {
  countReclaimed++;
  onFinalize$.next(countReclaimed);
});

class TestObject {
  logPrefix: string;
  constructor(opts: {name: string}) {
    this.logPrefix = opts.name;
  }
}
async function test() {
  countReclaimed = 0;
  countRegistered = 0;
  // FinalizationRegistry must be exported to maintain strongly refered by ROOT module to avoid being GCed

  console.log('Initial heapTotal', formater.format(process.memoryUsage().heapTotal));

  let items = [] as {logPrefix: string}[];

  for (let i = 0; i < NUM; i++) {
    const item = items[i] = new TestObject({name: 'bitter'});
    reg.register(item, item.logPrefix, item);
    countRegistered++;
  }
  console.log('\n> before GC heapTotal', formater.format(process.memoryUsage().heapTotal));

  // for (const item of items) {
  //   item.dispose();
  // }

  const done = rx.firstValueFrom(rx.merge(
    onFinalize$.asObservable().pipe(
      rx.timeout(20000),
      rx.take(NUM),
      rx.map((claimedCount, i) => {
        if ((i + 1) % 500 === 0)
          console.log('message count: #', i + 1, ': ', claimedCount, ', count reclaimed', countReclaimed);
      }),
      rx.count(),
      rx.map((count) => {
        console.log('---- After GC, rss', formater.format(process.memoryUsage.rss()));
        console.log('\n> heapTotal', formater.format(process.memoryUsage().heapTotal));
        console.log('> Reclaimed number of Configurables', count);
        console.log('> size of Configurables:', formater.format(allRefs.size));
        assert.equal(countReclaimed, NUM);
        // assert.equal(allRefs.size, 0);
      }),
      rx.catchError((err, src) => {
        console.error(err);
        throw err;
      })
    ),
    rx.timer(0, 1000).pipe(
      rx.map((t) => console.log(`${t}s count reclaimed: ` + countReclaimed, 'allRefs:', allRefs.size, 'first item',
        allRefs.size < 5 ? [...allRefs.values()].map(item => item.deref()?.logPrefix) : '')
      ),
      rx.ignoreElements()
    ),
    rx.timer(30000) // wait for 30s at most, if there is no timer, Node.js will exit due to event loop become empty before GC taking place
  ).pipe(
    rx.take(1)
  ));

  items = [];
  console.log('size of Configurables:', formater.format(allRefs.size));
  console.log('Number of finalization registry items', countRegistered);
  // GC must be triggered after a few million seconds to be able to take effect on all heap objects, otherwise it might miss latest created objects
  await new Promise<void>(resolve => setTimeout(resolve, 1500));
  globalThis.gc!();
  console.log('::countReclaimed: ', countReclaimed);
  await new Promise<void>(resolve => setImmediate(resolve));
  await done;
  return reg;
}

// This script must be executed with command line option "--expose-gc --trace-gc", you may find more v8 options with command `node --v8-options`
async function run() {
  for (let i = 0; i < 4; i++) {
    await test();
  }
  // eslint-disable-next-line no-debugger
  debugger;
}
void run();
