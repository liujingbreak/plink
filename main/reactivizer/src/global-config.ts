import {CoreOptions} from './stream-core';

export type RxControlConfigType<I = any> = Partial<Omit<CoreOptions<I>, 'autoConnect'>>;
export type RxControlConfigEntryType<K extends keyof RxControlConfigType = keyof RxControlConfigType> = [K, RxControlConfigType[K]];
// const globalConfigChange$ = new rx.Subject<RxControlConfigEntryType>();
// export const globalConfigChanges = globalConfigChange$.asObservable();

export const defaultConfig: Required<RxControlConfigType> = {
  name: '',
  debug: false,
  debugIncludeTypes: null,
  debugExcludeTypes: [],
  logStyle: 'full',
  log: null
};

export type GlobalConfigOptions = Pick<CoreOptions<any>, 'log' | 'logStyle' | 'debug'>;

export interface Configurable {
  logPrefix: string;
  config(opts: GlobalConfigOptions): void;
}

export const allRefs = new Set<WeakRef<Configurable>>();

export function addConfigurable(item: Configurable) {
  const ref = new WeakRef<Configurable>(item);
  allRefs.add(ref);
  finalizationRegistry.register(item, ref, item);
}

export function* iterateConfigurables(): Generator<Configurable, void, unknown> {
  for (const item of allRefs) {
    const obj = item.deref();
    if (obj)
      yield obj;
  }
}

// FinalizationRegistry must be strongly refered by ROOT module to avoid being GCed
// e.g. being referred by a "export" object
const finalizationRegistry = new FinalizationRegistry<WeakRef<Configurable>>(ref => {
  // eslint-disable-next-line no-console
  allRefs.delete(ref);
});

export function configAll(opts: GlobalConfigOptions) {
  for (const item of iterateConfigurables()) {
    item.config(opts);
  }
}
