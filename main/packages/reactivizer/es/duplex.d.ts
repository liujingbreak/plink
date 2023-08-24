import { CoreOptions, RxController, ActionFunctions } from './control';
export type DuplexOptions = {
    debug?: string | false;
    outputDebug?: boolean;
    log?: CoreOptions['log'];
};
export declare class DuplexController<I extends ActionFunctions, O extends ActionFunctions> {
    /** input actions controller, abbrevation name of "inputControl" */
    i: RxController<I>;
    inputControl: RxController<I>;
    /** output actions controller abbrevation name of "outputControl" */
    o: RxController<O>;
    outputControl: RxController<O>;
    constructor(opts?: DuplexOptions);
}
