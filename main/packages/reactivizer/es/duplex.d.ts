import { CoreOptions, RxController } from './control';
export type DuplexOptions<I = Record<string, never>> = CoreOptions<I>;
export declare class DuplexController<I, O> {
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
