import { CoreOptions } from './stream-core';
import { RxController2 } from './control2';
export type DuplexOptions<I = Record<string, never>> = CoreOptions<I>;
export declare class DuplexController<I, O> {
    /** input actions controller, abbrevation name of "inputControl" */
    i: RxController2<I>;
    inputControl: RxController2<I>;
    /** output actions controller abbrevation name of "outputControl" */
    o: RxController2<O>;
    outputControl: RxController2<O>;
    private id;
    constructor(opts?: DuplexOptions<I & O>);
    /** Invoke `setName` on RxController */
    setName(value: string): void;
}
