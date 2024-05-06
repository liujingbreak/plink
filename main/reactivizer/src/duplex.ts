import {CoreOptions, RxController} from './control';

export type DuplexOptions<I = Record<string, never>> = CoreOptions<I>;

let SEQ = new Date().getUTCMilliseconds();

export class DuplexController<I, O> {
  /** input actions controller, abbrevation name of "inputControl" */
  i: RxController<I>;
  inputControl: RxController<I>;
  /** output actions controller abbrevation name of "outputControl" */
  o: RxController<O>;
  outputControl: RxController<O>;
  private id = SEQ++;

  constructor(opts?: DuplexOptions<I & O>) {
    const name = opts?.name ?? '';
    this.inputControl = this.i = new RxController<I>({...opts as DuplexOptions<I>, debug: opts?.debug, name: name + `#${this.id}.i `, log: opts?.log});
    this.outputControl = this.o = new RxController<O>({...opts as DuplexOptions<O>, debug: opts?.debug, name: name + `#${this.id}.o `, log: opts?.log});
  }

  /** Invoke `setName` on RxController */
  setName(value: string) {
    this.i.setName(value + `#${this.id}.i `);
    this.o.setName(value + `#${this.id}.o `);
  }
}
