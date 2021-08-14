import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export enum HtmlTokenType {
  // comments,
  '<',
  '>',
  '/>',
  '(',
  ')',
  '[',
  ']',
  '</',
  '=',
  qm, // quotation mark
  identity,
  stringLiteral,
  any, // .*
  space,
  comment
}

class Context<T, U> {
  currValue!: T;
  index!: number;
  error?: string;
  rootScope: HandlerScope<T, U>;
  currScope: HandlerScope<T, U>;
  // handlerStack: {name: string; handler: StateHandler<T, U>}[] = [];
  _needRestore = false;

  // _caching = false;
  _cacheData: T[] = [];
  _cacheStartPos = 0;
  _marker: number[] = [];

  constructor(rootScopeCreator: () => HandlerScope<T, U>, public output: rx.Subscriber<U>) {
    this.currScope = this.rootScope = rootScopeCreator();
  }

  mark() {
    if (this._marker.length === 0) {
      this._cacheData.splice(0);
      this._cacheData[0] = this.currValue;
      this._cacheStartPos = this.index;
    }
    this._marker.push(this.index);
    // this._caching = true;
  }

  clearMark() {
    this._marker.pop();
    this._cacheData.splice(0);
  }

  restore() {
    this._needRestore = true;
  }

  _onNext(inputValue: T, index: number) {
    this.index = index;
    this.currValue = inputValue;
    if (this._marker.length > 0) {
      this._cacheData.push(inputValue);
    }
    this.currScope.run(this);
    if (this.error) {
      throw new Error(`At position ${index}, ${this.error}, handler stacks: ${scopeStack(this.currScope).join('\n')}`);
    }
    if (this._needRestore && this._marker.length > 0) {
      this._needRestore = false;
      const mark = this._marker.pop()!;
      for (let i = mark - this._cacheStartPos, end = this._cacheData.length; i < end; i++) {
        this.currValue = this._cacheData[i];
        this.index = i + this._cacheStartPos;
        this.currScope.run(this);
      }
    }
  }
}

interface Step<T, U> {
  next?: Step<T, U>;
  scope: HandlerScope<T, U>;
  // run(value: T): boolean;

}

class ValueStep<T, U> implements Step<T, U> {
  constructor(public scope: HandlerScope<T, U>, public value: T) {
  }
  run(value: T) {
    return (this.value === value);
  }
}

class HandlerStep<T, U> implements Step<T, U> {
  constructor(public scope: HandlerScope<T, U>, public scopeCreator: () => HandlerScope<T, U>) {}

  run(ctx: Context<T, U>) {
    const childScope = this.scopeCreator();
    childScope.parent = this.scope;
    childScope.run(ctx);
    return true;
  }
}

interface HandlerScope<T, U> {
  name: string;
  startStep: Step<T, U>;
  curreStep: Step<T, U>;
  parent?: HandlerScope<T, U>;
  run(ctx: Context<T, U>): void;
}

function scopeStack<T, U>(currScope: HandlerScope<T, U>) {
  const desc = [currScope.name];
  let scope = currScope.parent;
  while (scope) {
    desc.unshift(currScope.name);
    scope = currScope.parent;
  }
  return desc;
}

function returnStack<T, U>(currScope: HandlerScope<T, U>, ctx: Context<T, U>) {
  if (currScope.parent) {
    const nextStep = currScope.parent.curreStep.next;
    if (nextStep) {
      currScope.parent.curreStep = nextStep;
      currScope.parent.run(ctx);
    }
  }
}

type StateHandler<T, U> = (ctx: Context<T, U>) => boolean;

interface HandlerFactory<T, U> {
  (): {name: string; handler: StateHandler<T, U>};
  _isHandler: true;
}


export function createParseOperator<T, U>(rootHandler: StateHandler<T, U>) {
  return (input: rx.Observable<T>) => {
    return new rx.Observable<U>(sub => {
      const ctx = new Context<T, U>(rootHandler, sub);
      const subscription = input.pipe(op.map(function(inputValue: T, index: number) {
        ctx._onNext(inputValue, index);
      })).subscribe();
      return () => subscription.unsubscribe();
    });
  };
}

export function createPath<T extends string | {toString(): string}, U>(
  name: string, ...values: (T | HandlerFactory<T, U>)[]) : ReturnType<HandlerFactory<T, U>> {
  let step = 0;

  const handler: StateHandler<T, U> = function(ctx) {
    if (step >= values.length) {
      ctx.handlerStack.pop();
    }
    const stepValue = values[step];
    if (isHandlerFactory(stepValue)) {
      const handler = stepValue();
      ctx.handlerStack.push(handler);
    } else if (stepValue !== ctx.currValue) {
      ctx.error = `Expect "${stepValue.toString()}", but get: ${ctx.currValue.toString()}`;
      return false;
    }
    step++;
    return true;
  };
  return {name, handler};
}
(createPath as HandlerFactory<unknown, unknown>)._isHandler = true;

interface Choice<T, U> {
  /** look ahead */
  la: T | HandlerFactory<T, U>;
  path: T | HandlerFactory<T, U>;
}

export function createBranch<T extends string | {toString(): string}, U>(
  name: string, ...choices: Choice<T, U>[]) : ReturnType<HandlerFactory<T, U>> {

  let choiceIdx = 0;
  let isLookAhead = true;

  const handler: StateHandler<T, U> = function(ctx) {
    if (choiceIdx === 0) {
      ctx.mark();
    }
    if (choiceIdx >= choices.length) {
      ctx.handlerStack.pop();
      ctx.error = 'Out of choice';
      ctx.clearMark();
      return false;
    }
    const choice = choices[choiceIdx];
    if (isLookAhead) {
      if (isHandlerFactory(choice.la)) {
        ctx.handlerStack.push(choice.la());
      } else if (choice.la === ctx.currValue) {

      }
    } else {

    }
    choiceIdx++;
    return true;
  };
  return {name, handler};
}
(createBranch as HandlerFactory<unknown, unknown>)._isHandler = true;

