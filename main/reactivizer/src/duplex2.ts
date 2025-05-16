import {CoreOptions} from './stream-core';
import {RxController2} from './control2';

export type DuplexOptions<I = Record<string, never>> = CoreOptions<I>;

let SEQ = new Date().getUTCMilliseconds();

export class DuplexController<I, O> {
  /** input actions controller, abbrevation name of "inputControl" */
  i: RxController2<I>;
  inputControl: RxController2<I>;
  /** output actions controller abbrevation name of "outputControl" */
  o: RxController2<O>;
  outputControl: RxController2<O>;
  private id = SEQ++;

  constructor(opts?: DuplexOptions<I & O>) {
    const name = opts?.name ?? '';
    this.inputControl = this.i = new RxController2<I>({...opts as DuplexOptions<I>, debug: opts?.debug, name: name + `#${this.id}.i`, log: opts?.log});
    this.outputControl = this.o = new RxController2<O>({...opts as DuplexOptions<O>, debug: opts?.debug, name: name + `#${this.id}.o`, log: opts?.log});
  }

  /** Invoke `setName` on RxController */
  setName(value: string) {
    this.i.setName(value + `#${this.id}.i `);
    this.o.setName(value + `#${this.id}.o `);
  }

  config<I2, O2>(opts: CoreOptions<I2 & O2 & I & O>) {
    this.i.config(opts as CoreOptions<I>);
    this.o.config(opts as CoreOptions<O>);
  }
}

