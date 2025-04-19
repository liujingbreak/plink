export interface CoreOptions<I = Record<string, never>> {
    name?: string;
    /** default is `true`, set to `false` will result in Connectable multicast action observable "action$" not
    * being automatically connected, you have to manually call `RxController::connect()` or `action$.connect()`,
    * otherwise, any actions that is dispatched to `actionUpstream` will not be observed and emitted by `action$`,
    * Refer to [https://rxjs.dev/api/index/function/connectable](https://rxjs.dev/api/index/function/connectable)
    * */
    autoConnect?: boolean;
    /** @deprecated set "enableLog" instead */
    debug?: boolean;
    /** default is `false`, setting `true` will print message in console log */
    enableLog?: boolean;
    /** Log all actions whose type is listed in this property, by default "undefined" means actions of all types will be logged. */
    debugIncludeTypes?: (keyof I)[] | null;
    /** Exclude actions of specific types from "debugIncludeTypes" */
    debugExcludeTypes?: (keyof I)[];
    /**
     * "full" - print full message content, including "type" and "payload" tuple
     * "noParam" - print message type, without payload tuple
     */
    logStyle?: 'raw' | 'full' | 'noParam';
    debugTableAction?: boolean;
    /** Use a customized log function
     */
    log?: null | ((msg: string, ...objs: any[]) => unknown);
}
