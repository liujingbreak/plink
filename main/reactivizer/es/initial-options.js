/**
 * Any change of this configuration object must be done earlier
 * before any reactive service being created to actually take effect.
 *
 * Also this configuration is not shared cross workers or threads, for
 * each worker or thread, the changes to it must be repeated.
**/
export const initOptions = {
    enableLog: false,
    logStyle: 'full'
};
export function changeInitOptions(opts) {
    Object.assign(initOptions, opts);
}
//# sourceMappingURL=initial-options.js.map