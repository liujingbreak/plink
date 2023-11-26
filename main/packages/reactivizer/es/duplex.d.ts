import { CoreOptions, RxController, ActionFunctions } from './control';
export type DuplexOptions<I extends ActionFunctions = Record<string, never>> = CoreOptions<I>;
export declare class DuplexController<I extends ActionFunctions, O extends ActionFunctions> {
    /** input actions controller, abbrevation name of "inputControl" */
    i: RxController<I>;
    inputControl: RxController<I>;
    /** output actions controller abbrevation name of "outputControl" */
    o: RxController<O>;
    outputControl: RxController<O>;
    private id;
    constructor(opts?: DuplexOptions<I & O>);
    /** Invoke `setName` on RxController */
    setName(value: string): void;
}
