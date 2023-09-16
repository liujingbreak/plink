import {CoreOptions, RxController, ActionFunctions} from './control';

export type DuplexOptions<I> = CoreOptions<(string & keyof I)[]>;

export class DuplexController<I extends ActionFunctions, O extends ActionFunctions> {
  /** input actions controller, abbrevation name of "inputControl" */
  i: RxController<I>;
  inputControl: RxController<I>;
  /** output actions controller abbrevation name of "outputControl" */
  o: RxController<O>;
  outputControl: RxController<O>;

  constructor(opts?: DuplexOptions<I & O>) {
    this.inputControl = this.i = new RxController<I>({...opts, debug: opts?.debug ? opts?.debug + '.input' : false, log: opts?.log});
    this.outputControl = this.o = new RxController<O>({...opts, debug: opts?.debug ? opts?.debug + '.output' : false, log: opts?.log});
  }
}
