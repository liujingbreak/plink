import {CoreOptions, RxController, ActionFunctions} from './control';

export type DuplexOptions<I = Record<string, never>> = CoreOptions<(string & keyof I)[]>;

export class DuplexController<I extends ActionFunctions, O extends ActionFunctions> {
  /** input actions controller, abbrevation name of "inputControl" */
  i: RxController<I>;
  inputControl: RxController<I>;
  /** output actions controller abbrevation name of "outputControl" */
  o: RxController<O>;
  outputControl: RxController<O>;

  constructor(opts?: DuplexOptions<I & O>) {
    const name = opts?.name ?? '';
    this.inputControl = this.i = new RxController<I>({...opts, debug: opts?.debug, name: name + '.input', log: opts?.log});
    this.outputControl = this.o = new RxController<O>({...opts, debug: opts?.debug, name: name + '.output', log: opts?.log});
  }
}
