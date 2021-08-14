import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {cacheAndReplay} from './lang-reactive-ops';

enum StepAction {
  mark,
  replay,
  unmark,

  matched,
  unmatched,
  matchedAndReplay,
  unmatchedAndReplay,
  debug,
}

const stepActions = {
  mark() {},
  replay() {},
  unmark() {},
  process(payload: {d: any; i: number}) {},
  sucess() {},
  failed(reason: string[]) {}
};

type Action = {type: keyof typeof stepActions, payload: Parameters<(typeof stepActions)[keyof typeof stepActions]>};
type ActionByType = {[K in keyof typeof stepActions]: rx.Observable<(typeof stepActions)[K] extends (payload: infer P) => void ? P : unknown>};

function createDispatcher(action$: rx.Subject<Action>) {
  const dispatcher = {} as {[K in keyof typeof stepActions]: (typeof stepActions)[K]};
  for (const key of Object.keys(stepActions)) {
    dispatcher[key] = (arg1: any) => {
      action$.next(arg1)
    };
  }
  return dispatcher;
}

function splitActionByType(action$: rx.Subject<Action>) {
  let sourceSub: rx.Subscription | undefined;
  let subscriberCnt = 0;

  const split$ = action$.pipe(
    op.map(action => dispatchByType[action.type]!.next(action))
  );

  const dispatchByType: {[K in keyof typeof stepActions]?: rx.Subject<any>} = {};
  const actionByType: Partial<ActionByType> = {};

  for (const type of Object.keys(stepActions)) {
    const dispatcher = dispatchByType[type] = new rx.Subject();
    actionByType[type] = rx.defer(() => {
      if (subscriberCnt++ === 0) {
        sourceSub = split$.subscribe();
      }
      return dispatcher;
    }).pipe(
      op.finalize(() => {
        if (--subscriberCnt === 0) {
          sourceSub?.unsubscribe();
        }
      })
    )
  }
  return actionByType as ActionByType;
}

class Step<T> {
  dispatcher = createDispatcher(new rx.Subject());

  process(input: T, offset: number) {
    this.dispatcher.process({d: input, i: offset});
  }
}

export class ComparisonStep<T> extends Step<T> {
  constructor(public expect: T) {
    super();
  }
  process(input: T, offset: number) {
    if (input === this.expect)
      this.actions.next(StepAction.matched);
    else {
      this.reason = [`at offset ${offset}, expect: ${this.expect + ''}, got: ${input + ''}`];
      this.actions.next(StepAction.unmatched);
    }
  }
}

export class ScopeStep<T> extends Step<T> {
  currStep: Step<T>;
  steps: Step<T>[];

  constructor(public name: string, ...stepFactories: (() => Step<T>)[]) {
    super();
    this.steps = stepFactories.map((fac, idx) => fac());
    rx.merge(...this.steps.map((s, idx) => s.actions.pipe(
      op.map(action => {
        if (action === StepAction.matched || action === StepAction.matchedAndReplay) {
          if (idx < this.steps.length - 1) {
            this.currStep = this.steps[idx + 1];
            if (action === StepAction.matchedAndReplay)
              this.actions.next(StepAction.replay);
          } else {
            this.actions.next(action);
            return null;
          }
        } else if (action === StepAction.unmatched || action === StepAction.unmatchedAndReplay) {
          this.reason = [this.name, ...s.reason!];
          this.actions.next(action);
          return null;
        }
        return action;
      }),
      op.takeWhile(action => action != null)
    ))).pipe(
      op.tap(action => {
        if (action != null)
          this.actions.next(action);
      })
    ).subscribe();
    this.currStep = this.steps[0];
  }

  process(input: T, offset: number) {
    if (this.currStep)
      this.currStep.process(input, offset);
  }
}

export class ChoiceStep<T> extends Step<T> {
  currStep?: Step<T>;
  choices: Step<T>[];
  private began = false;

  constructor(...choiceFactories: (() => Step<T>)[]) {
    super();
    const failedChoiceResult = [] as string[][];
    this.choices = choiceFactories.map((fac, idx) => fac());
    rx.merge(...this.choices.map((choice, idx) => choice.actions.pipe(
      op.map(action => {
        if (action === StepAction.matched || action === StepAction.matchedAndReplay) {
          if (action === StepAction.matchedAndReplay)
              this.actions.next(StepAction.replay);
          this.actions.next(StepAction.unmark);
          this.actions.next(action);
          
        } else if (action === StepAction.unmatched || action === StepAction.unmatchedAndReplay) {
          this.reason = choice.reason;
          if (idx < this.choices.length - 1) {
            this.currStep = this.choices[idx + 1];
            this.actions.next(StepAction.replay);
            
          } else {
            this.actions.next(action);
            return null;
          }
        }
          
        } else if (action === StepAction.unmatched || action === StepAction.unmatchedAndReplay) {
          this.reason = [this.name, ...s.reason!];
          this.actions.next(action);
          return null;
        }
        return action;
      }),
      op.takeWhile(action => action != null)
    ))).pipe().subscribe();
      const choice = fac();
      choice.matched.pipe(
        op.map(result => {
          if (result === true) {
            this.dispatcher.next(StepAction.unmark);
            this.matched.next(true);
          } else {
            failedChoiceResult.push(result);
            if (idx < this.choices.length - 1) {
              this.currStep = this.choices[idx + 1];
              this.dispatcher.next(StepAction.replay);
            } else {
              this.dispatcher.next(StepAction.unmark);
              this.matched.next(['None is matched: ' + failedChoiceResult.join(', ')]);
            }
          }
        }),
        op.take(1)
      ).subscribe();
      return choice;
    });
    this.currStep = this.choices[0];
  }

  process(input: T, offset: number) {
    if (!this.began) {
      this.began = true;
      this.dispatcher.next(StepAction.mark);
    }
    if (this.currStep) {
      this.currStep.process(input, offset);
    }
  }
}

export class LoopStep<T> extends Step<T> {
  private loopable: Step<T>;
  private dispatcher = new rx.Subject<StepAction>();
  private needMark = true;

  constructor(factory: () => Step<T>, minTimes = 0, maxTimes = Number.MAX_VALUE) {
    super();
    this.actions = this.dispatcher.asObservable();
    this.loopable = factory();
    let loopCount = 0;
    // this.prepareLoopable(loopCount, factory, minTimes, maxTimes);
    const loopable$ = new rx.Subject<Step<T>>();
    loopable$.pipe(
      op.concatMap(loopable => {
        return rx.merge(
          this.loopable.actions ? this.loopable.actions.pipe(
            op.tap(action => {
              this.dispatcher.next(action);
            })
          ) : rx.EMPTY,
          this.loopable.matched.pipe(
            op.map(result => {
              if (result === true) {
                this.dispatcher.next(StepAction.unmark);
                loopCount++;
                if (loopCount < maxTimes) {
                  this.prepareLoopable(loopCount, factory, minTimes, maxTimes);
                } else {
                  this.matched.next(true);
                }
              } else {
                if (loopCount >= minTimes) {
                  this.matched.next(true);
                  this.dispatcher.next(StepAction.replay);
                } else {
                  this.dispatcher.next(StepAction.unmark);
                  this.matched.next(result);
                }
              }
            })
          )
        );
      }),
      op.takeUntil(this.matched)
    ).subscribe();
  }

  process(input: T, offset: number) {
    if (this.needMark) {
      this.dispatcher.next(StepAction.mark);
      this.needMark = false;
    }
    this.loopable.process(input, offset);
  }

  private prepareLoopable(loopCount: number, factory: () => Step<T>, minTimes: number, maxTimes: number) {
    this.needMark = true;
    this.loopable = factory();
    if (this.loopable.actions) {
      this.loopable.actions.pipe(
        op.tap(action => {
          this.dispatcher.next(action);
        }),
        op.takeUntil(this.matched)
        // replay action is emitted after step.matched, so we have to keep listerning to actions
        // op.takeUntil(step.matched)
      ).subscribe();
    }
    this.loopable.matched.pipe(
      op.take(1),
      op.tap(result => {
        if (result === true) {
          this.dispatcher.next(StepAction.unmark);
          loopCount++;
          if (loopCount < maxTimes) {
            this.prepareLoopable(loopCount, factory, minTimes, maxTimes);
          } else {
            this.matched.next(true);
          }
        } else {
          if (loopCount >= minTimes) {
            this.matched.next(true);
            this.dispatcher.next(StepAction.replay);
          } else {
            this.dispatcher.next(StepAction.unmark);
            this.matched.next(result);
          }
        }
      })
    ).subscribe();
  }
}

export function parse<T>(stateMachine: () => Step<T>) {
  return (input$: rx.Observable<T>) => {
    const rootStep = stateMachine();
    return new rx.Observable(sub => {

      const sup = rx.merge(
        rootStep.actions ? rootStep.actions.pipe(
          op.tap(action => console.log('::' + StepAction[action]))
        ) : rx.EMPTY,
        rootStep.matched.pipe(
          op.map(result => {
            sub.next(result);
            sub.complete();
          }),
          op.take(1)
        ),
        // input$ must be the last one being subscribed in merge list, otherwise other subscription night don't have change to 
        // observe emitted result after input$.pipe() has completed
        input$.pipe(
          cacheAndReplay(rootStep.actions ? rootStep.actions.pipe(
              op.filter(action => action === StepAction.mark)
            ) : rx.EMPTY,
            rootStep.actions ? rootStep.actions.pipe(
              op.filter(action => action === StepAction.replay)
            ) : rx.EMPTY,
            rootStep.actions ? rootStep.actions.pipe(
              op.filter(action => action === StepAction.unmark)
            ) : rx.EMPTY
          ),
          op.map(({value, idx}, totalIndex) => {
            // eslint-disable-next-line no-console
            console.log(`[${totalIndex}] offset:${idx}, value: ${'' + value}`);
            rootStep.process(value, idx);
          }),
          op.takeUntil(rootStep.matched)
        )
      ).subscribe();
      // return rootStep.matched;
      return () => sup.unsubscribe();
    });
  };
}

export function test() {
  rx.from('abcxdedef'.split('')).pipe(
    parse(() => new ScopeStep('hellow',
        () => new ComparisonStep('a'),
        () => new ComparisonStep('b'),
        () => new ChoiceStep(() => new ComparisonStep('1'), () => new ComparisonStep('c')),
        () => new ComparisonStep('x'),
        () => new LoopStep(() => new ScopeStep('loop de',
          () => new ComparisonStep('d'),
          () => new ComparisonStep('e')
         )),
        () => new ComparisonStep('1')
      )
    ),
    op.tap(r => console.log('---> ', r))
  ).subscribe();
}
