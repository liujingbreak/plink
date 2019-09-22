
// export type StateHandler<V> = (machine: LLStateMachine<V>) => void;

export interface StateHandler<V> {
  name?: string;
  handle(machine: LLStateMachine<V>, value: V): Promise<any> | any;
  [stateName: string]: any;
}

export class LLStateMachine<V> {
  debugOn = false;
  stack: StateHandler<V>[] = [];
  cache: V[] = [];
  currValue: V;
  position = 0;
  line = 1;
  column = 1;
  private currChunk: Chunk<V, any>;
  private switchDone = Promise.resolve();
  private cacheReadIdx = 0;

  constructor(firstHandler: StateHandler<V>) {
    this.stack.push(firstHandler);
  }

  consume() {
    this.cache.splice(0, this.cacheReadIdx + 1); // Only keep the last one
    this.cacheReadIdx = -1;
  }

  /**
   * Reset to the position after last consumed
   */
  reset() {
    if (this.currChunk && !this.currChunk.isClosed) {
      const resetCnt = this.cacheReadIdx + 1;
      this.currChunk.values.splice(this.currChunk.values.length - resetCnt, resetCnt);
    }
    this.cacheReadIdx = -1;
  }

  push(handler: StateHandler<V>) {
    this.stack.push(handler);
  }

  /**
   * popup current machine from stack, next time it will go to last machine.
   */
  pop() {
    this.stack.pop();
  }

  startChunk<T>(type: T): Chunk<V, T> {
    if (this.currChunk)
      this.currChunk.close();
    this.currChunk = new Chunk<V, T>(type, this).open();
    return this.currChunk;
  }

  closeChunk() {
    return this.currChunk.close();
  }

  onNext(values: V[]) {
    this.cache.push(...values);

    const switchState = () => {
      this.switchDone = this.switchDone
      .then(() => {
        if (this.cacheReadIdx < this.cache.length) {
          const value = this.cache[this.cacheReadIdx];
          if (this.currChunk)
            this.currChunk.values.push(value);
          return this.callHandler(value)
            .then(() => {
              this.cacheReadIdx++;
              this.position++;
              this.column++;
              if ((value as any) === '\n') {
                this.line++;
                this.column = 1;
              }
              switchState();
            });
        }
      });
    };
    switchState();
  }

  done() {
    return this.switchDone;
  }

  private callHandler(value: V): Promise<any> {
    const currHandler = this.stack[this.stack.length - 1];
    return Promise.resolve(currHandler.handle(this, value));
  }
}

export class Chunk<V, T> {
  values: V[] = [];
  start: Postion;
  end?: number;
  isClosed = false;

  constructor(public type: T, private machine: LLStateMachine<V>) {}

  open() {
    this.start = {
      pos: this.machine.position,
      line: this.machine.line,
      column: this.machine.column
    };
    return this;
  }

  close() {
    this.isClosed = true;
    this.end = this.machine.position + 1;
    return this;
  }

  toString() {
    return JSON.stringify({start: this.start, end: this.end, value: this.values});
  }
}

export interface Postion {
  pos: number;
  line: number;
  column: number;
}
