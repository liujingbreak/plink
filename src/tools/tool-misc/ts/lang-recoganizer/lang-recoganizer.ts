import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {cacheAndReplay} from './lang-reactive-ops';

interface PositionInfo {
  start: number;
  end: number;
}

const childStepActions = {
  process(payload: {d: any; i: number}) {},
  sucess<R extends PositionInfo>(result: R) {},
  failed(reason: string[]) {}
};

type MarkAndReplay = {
  mark(laNum: number): void;
  replay(position: number): void;
};

type Action = {
  type: keyof typeof childStepActions;
  payload: Parameters<(typeof childStepActions)[keyof typeof childStepActions]>;
};

type ActionByType = {
  [K in keyof typeof childStepActions]: rx.Observable<
    (typeof childStepActions)[K] extends (payload: infer P) => void ?
      {payload: P; type: K} :
      unknown
    >
};

function createDispatcher(action$: rx.Subject<Action>) {
  const dispatcher = {} as {[K in keyof typeof childStepActions]: (typeof childStepActions)[K]};
  for (const type of Object.keys(childStepActions)) {
    dispatcher[type] = (arg1: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      action$.next({type: type as keyof typeof childStepActions, payload: arg1});
    };
  }
  return dispatcher;
}

export function splitActionByType(action$: rx.Observable<Action>): ActionByType {
  const source = action$.pipe(op.share());
  const actionByType = {} as ActionByType;
  for (const type of Object.keys(childStepActions)) {
    Object.defineProperty(actionByType, type, {
      get() {
        return source.pipe(op.filter(action => action.type === type));
      }
    });
  }
  return actionByType;
}

function createStep<T>(interceptor?: () => rx.OperatorFunction<Action, Action>) {
  const source = new rx.Subject<Action>();
  const dispatcher = createDispatcher(source);
  const actions = interceptor ? source.pipe(op.observeOn(rx.queueScheduler), interceptor()) :
      source.pipe(op.observeOn(rx.queueScheduler));
  return {dispatcher, actions};
}

type StepFactory = (mr: MarkAndReplay) => ReturnType<typeof createStep>;

/**
 * simplest comparison step
 * @param expectStr 
 * @returns 
 */
export function cmp<T>(...expectStr: T[]) {
  return (mr: MarkAndReplay) => {
    const {dispatcher, actions} = createStep();
    const actionByType = splitActionByType(actions);
    let index = 0;
    let startPosition = -1;
    if (expectStr.length === 1 && typeof expectStr[0] === 'string' && (expectStr[0] as unknown as string).length > 1 ) {
      // console.log('here');
      expectStr = (expectStr[0] as unknown as string).split('') as unknown as T[];
    }

    let last = expectStr.length - 1;
    actionByType.process.pipe(
      op.tap(({payload: {d: input, i: offset}}) => {
        if (startPosition === -1)
          startPosition = offset;
        let expect = expectStr[index];
        // console.log('compare @' + offset, input, 'with', this.expect);
        if (input === expect) {
          if (index < last) {
            index++;
          } else {
            index = 0;
            dispatcher.sucess({start: startPosition, end: offset + 1});
          }
        } else {
          dispatcher.failed([`at offset ${offset}, expect: ${expect + ''}, got: ${input + ''}`]);
        }
      })
    ).subscribe();
    return {dispatcher, actions};
  };
}

type ScopeResult = PositionInfo & {name: string; children: PositionInfo[]};
/** scope step */
export function scope<T>(name: string, stepFactories: (StepFactory)[],
  opts?: {onSuccess(children: PositionInfo[]): any}): StepFactory {
  return (mr: MarkAndReplay) => {
    let onSuccessResultTransformer: undefined | ((children: PositionInfo[]) => any);
    if (opts)
      onSuccessResultTransformer = opts.onSuccess;
    const {dispatcher, actions} = createStep();
    const actionByType = splitActionByType(actions);
    const steps = stepFactories.map((fac) => fac(mr));
    let currStepIdx = 0;
    const last = steps.length - 1;
    let startPosition = -1;
    let currPosition = -1;
    const stepResults = [] as PositionInfo[];

    const subscribeStep = () => {
      const step = steps[currStepIdx];
      const childStepActions = splitActionByType(step.actions);
      rx.merge(
        rx.merge(
          childStepActions.sucess.pipe(
            op.map(({payload}) => {
              stepResults.push(payload);
              if (currStepIdx < last) {
                currStepIdx++;
                subscribeStep();
              } else {
                const result: ScopeResult = {
                  name,
                  start: startPosition,
                  end: currPosition + 1,
                  children: stepResults
                };
                dispatcher.sucess(onSuccessResultTransformer ? onSuccessResultTransformer(result.children) : result);
                return null;
              }
            })
          ),
          childStepActions.failed.pipe(
            op.map(({payload: reason}) => {dispatcher.failed([name, ...reason]); })
          )
        ).pipe(op.take(1))
      ).pipe(
        op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
      ).subscribe();
    };

    subscribeStep();

    actionByType.process.pipe(
      op.map(({payload}) => {
        if (startPosition === -1)
          startPosition = payload.i;
        currPosition = payload.i;
        steps[currStepIdx].dispatcher.process(payload);
      })
    ).pipe(
      op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
    ).subscribe();

    return {dispatcher, actions};
  };
}


/** Choice */
export function choice(laNum = 2, ...choiceFactories: (StepFactory)[]) {
  return (mr: MarkAndReplay) => {
    const {dispatcher, actions} = createStep();
    const failedChoiceResult = [] as string[][];
    const choices = choiceFactories.map((fac, idx) => fac(mr));
    const actionByType = splitActionByType(actions);
    let currChoiceIdx = 0;
    let replayPos: number;

    actionByType.process.pipe(
      op.map(({payload}) => {
        if (replayPos == null) {
          replayPos = payload.i;
          mr.mark(laNum);
        }
        choices[currChoiceIdx].dispatcher.process(payload);
      })
    ).pipe(
      op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
    ).subscribe();

    const subscribeCurrentChoice = () => {
      const choiceActions = splitActionByType(choices[currChoiceIdx].actions);

      rx.merge(
      ).pipe(
        op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
      ).subscribe();

      choiceActions.sucess.pipe(
        op.tap(({payload}) => {
          dispatcher.sucess(payload);
        }),
        op.take(1),
        op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
      ).subscribe();

      const last = choices.length - 1;
      choiceActions.failed.pipe(
        op.tap(({payload}) => {
          failedChoiceResult.push(payload);
          if (currChoiceIdx < last) {
            currChoiceIdx++;
            subscribeCurrentChoice();
            mr.replay(replayPos);
          } else {
            dispatcher.failed(['None is matched: ' + failedChoiceResult.map(str => str.join(' - ')).join('; ')]);
          }
        }),
        op.take(1),
        op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
      ).subscribe();
    };

    subscribeCurrentChoice();
    return {dispatcher, actions};
  };
}

export function isNotLa(step: StepFactory) {
  return (mr: MarkAndReplay) => {
    const {dispatcher, actions} = createStep();
    const actionByType = splitActionByType(actions);
    const predicateStep = step(mr);
    const predActions = splitActionByType(predicateStep.actions);
    let startPos: number;
    let currPos: number;

    rx.merge(
      actionByType.process.pipe(
        op.take(1),
        op.map(({payload: {d, i}}) => {
          startPos = i;
          mr.mark(Number.MAX_VALUE);
        })
      ),
      actionByType.process.pipe(
        op.tap(({payload}) => {
          currPos = payload.i;
          predicateStep.dispatcher.process(payload);
        })
      ),
      predActions.failed.pipe(
        op.tap(() => {
          dispatcher.sucess({start: startPos, end: currPos});
          mr.replay(startPos);
        })
      )
    ).subscribe();
    return {dispatcher, actions};
  };
}

interface LoopOptions {
  laNum?: number;
  /** default is true */
  greedy?: boolean;
  minTimes?: number;
  maxTimes?: number;
}

const defaultLoopOptions = {greedy: true, laNum: 2, minTimes: 0, maxTimes: Number.MAX_VALUE};

/** Loop */
export function loop(factory: StepFactory, opts?: LoopOptions) {
  return (mr: MarkAndReplay) => {
    const {dispatcher, actions} = createStep();
    let options: Required<LoopOptions>;
    if (opts == null) {
      options = defaultLoopOptions;
    } else {
      options = {...defaultLoopOptions, ...opts};
    }
    const actionByType = splitActionByType(actions);
    let loopCount = 0;
    let currentLoopable: ReturnType<typeof createStep>;
    let markedPos: number;
    let startPosition = -1;
    let currPostion = -1;
    let loopResults = [] as PositionInfo[];

    const markAtLoopableBegin = () => {
      actionByType.process.pipe(
        op.take(1),
        op.map(({payload}) => {
          markedPos = payload.i;
          mr.mark(options.laNum);
        })
      ).subscribe();
    };

    markAtLoopableBegin();

    const createNewLoopable = () => {
      currentLoopable = factory(mr);
      const childStepActions = splitActionByType(currentLoopable.actions);
      rx.merge(
        rx.merge(
          childStepActions.sucess.pipe(
            op.map(loopResult => {
              loopResults.push(loopResult.payload);
              loopCount++;
              if (loopCount < options.maxTimes) {
                markAtLoopableBegin();
                createNewLoopable();
              } else {
                const result: PositionInfo = {
                  start: startPosition,
                  end: currPostion + 1,
                  children: loopResults
                } as PositionInfo;
                dispatcher.sucess(result);
              }
            })
          ),
          childStepActions.failed.pipe(
            op.map(({payload: reason}) => {
              if (loopCount > options.minTimes) {
                const result: PositionInfo = {
                  start: startPosition,
                  end: markedPos,
                  children: loopResults
                } as PositionInfo;
                dispatcher.sucess(result);
                mr.replay(markedPos);
              } else {
                dispatcher.failed(reason);
              }
            })
          )
        ).pipe(op.take(1))
      ).pipe(
        op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
      ).subscribe();
    };

    createNewLoopable();

    actionByType.process.pipe(
      op.map(({payload}) => {
        if (startPosition === -1) {
          startPosition = payload.i;
        }
        currPostion = payload.i;
        currentLoopable.dispatcher.process(payload);
      })
    ).pipe(
      op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))
    ).subscribe();
    return {dispatcher, actions};
  };
}

export function parse<T>(stateMachine: StepFactory, debug = false) {
  return (input$: rx.Observable<T>) => {
    return rx.defer(() => {
      const mark$ = new rx.Subject<number>();
      const replay$ = new rx.Subject<number>();
      const mr: MarkAndReplay = {
        mark(laNum: number) {
          mark$.next(laNum);
        },
        replay(pos: number) {
          replay$.next(pos);
        }
      };

      const rootStep = stateMachine(mr);
      const actionByType = splitActionByType(rootStep.actions);

      return rx.merge(
        rx.merge(actionByType.sucess, actionByType.failed)
          .pipe(
            op.take(1)
        ),

        debug ? rootStep.actions.pipe(
          // eslint-disable-next-line no-console
          op.tap(action => console.log('::', action)),
          op.ignoreElements()
        ) : rx.EMPTY,

        // input$ must be the last one being subscribed in merge list, otherwise other subscription night don't have change to 
        // observe emitted result after input$.pipe() has completed
        input$.pipe(
          cacheAndReplay(mark$, replay$),
          op.map(({value, idx}, totalIndex) => {
            if (debug) {
              // eslint-disable-next-line no-console
              console.log(`[${totalIndex}] offset:${idx}, value: ${'' + value}`);
            }
            rootStep.dispatcher.process({d: value, i: idx});
          }),
          op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed)),
          op.ignoreElements()
        )
      );
    });
  };
}

export function test() {
  rx.from('abcxdefdef1'.split('')).pipe(
    parse(scope('hellow', [
        cmp('ab'),
        choice(2, cmp('1x'), cmp('cx')),
        loop(scope('loop de', [cmp('def')])),
        cmp('1')
      ]), true
    ),
    // eslint-disable-next-line no-console
    op.tap(r => console.log('---> ', JSON.stringify(r, null, '  ')))
  ).subscribe();
}
