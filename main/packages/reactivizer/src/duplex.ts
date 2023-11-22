import {CoreOptions, RxController, ActionFunctions} from './control';

export type DuplexOptions<I extends ActionFunctions = Record<string, never>> = CoreOptions<I>;

export class DuplexController<I extends ActionFunctions, O extends ActionFunctions> {
  /** input actions controller, abbrevation name of "inputControl" */
  i: RxController<I>;
  inputControl: RxController<I>;
  /** output actions controller abbrevation name of "outputControl" */
  o: RxController<O>;
  outputControl: RxController<O>;

  constructor(opts?: DuplexOptions<I & O>) {
    const name = opts?.name ?? '';
    this.inputControl = this.i = new RxController<I>({...opts, debug: opts?.debug, name: name + '.i ', log: opts?.log});
    this.outputControl = this.o = new RxController<O>({...opts, debug: opts?.debug, name: name + '.o ', log: opts?.log});
  }

  /** Invoke `setName` on RxController */
  setName(value: string) {
    this.i.setName(value + '.i ');
    this.o.setName(value + '.o ');
  }
}
