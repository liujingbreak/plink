import { CoreOptions } from './stream-core';
export type RxControlConfigType<I = any> = Omit<CoreOptions<I>, 'name' | 'autoConnect'>;
export type RxControlConfigEntryType<K extends keyof RxControlConfigType = keyof RxControlConfigType> = [K, RxControlConfigType[K]];
export declare const defaultConfig: Required<RxControlConfigType>;
export type GlobalConfigOptions = Pick<CoreOptions<any>, 'log' | 'logStyle' | 'debug'>;
export interface Configurable {
    logPrefix: string;
    config(opts: GlobalConfigOptions): void;
}
export declare const allRefs: Set<WeakRef<Configurable>>;
export declare function addConfigurable(item: Configurable): void;
export declare function iterateConfigurables(): Generator<Configurable, void, unknown>;
export declare function configAll(opts: GlobalConfigOptions): void;
