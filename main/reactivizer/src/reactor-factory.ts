import {SimplexReactorOptions, SimplexReactorCfgOpts} from './reactor-base';
import {CoreOptions, Interceptor} from './stream-core';
import {ActionInterceptor, RxController2} from './control2';
import {SimplexReactor, BaseActions} from './simplex-reactor';
import {ActionDispenser} from './action-dispenser';

function increId() {
  const id = [Date.now(), Math.random().toString(36).slice(2)] as [number, string];
  return id;
}
export interface ReactorFactory<
  I = Record<string, never>,
  LI extends readonly (keyof I)[] = [],
  C = CoreOptions<I>,
  P extends readonly [...unknown[]] = [],
> {
  /** Mainly for setting debug options for later creating service instance.
   * Unlike consturctor parameter `protoOptions`:
   * - this setting options will not be inherited by derived factory
   * - it does not allow set property `tableFor` which changes the "shape" of the service
  **/
  setting(options: C): this;
  /** User side API to create SimplexReactor instance */
  create(...params: P): SimplexReactor<I, LI>;
  isFactoryOf(svc: SimplexReactor<any, any>): boolean;
}

export interface DefContext<I, L extends readonly (keyof I)[], C> {
  setting: C | null;
  /** construct service instance, including calling "super" service definition callback */
  init: C extends CoreOptions<any> ?
      (options?: CoreOptions<I & BaseActions<I>> | null) => SimplexReactor<I, L> :
      (options: CoreOptions<I & BaseActions<I>>) => SimplexReactor<I, L>;
}

export class BaseReactorFactory<
  I = object,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly [],
  C = CoreOptions<I>,
  P extends [...unknown[]] = []
> implements ReactorFactory<I, LI, C, P> {
  #id: [number, string];
  private reactorDefinition: (context: DefContext<I, LI, CoreOptions<I>>, ...rest: P) => void =
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (ctx, ..._p) => {ctx.init();};

  private _interceptors: Interceptor[] | undefined;
  #setting?: C | null;

  constructor(public protoOptions: SimplexReactorOptions<I, LI>) {
    this.#id = increId();
  }

  /** Define message subscription in this method will be able to be inherited by any derived SimplexRectors
   **/
  defineReactor<PA extends any[]>(defCb: (context: DefContext<I, LI, C>, ...params: PA) => void) {
    const self = this as unknown as BaseReactorFactory<I, LI, C, PA>;
    self.reactorDefinition = defCb as typeof self.reactorDefinition;
    return self;
  }

  /** Mainly for setting debug options for later creating service instance.
   * Unlike consturctor parameter `protoOptions`:
   * - this setting options will not be inherited by derived factory
   * - it does not allow set property `tableFor` which changes the "shape" of the service
  **/
  setting(opt: C | null | undefined) {
    this.#setting = opt;
    return this;
  }

  forExtend<
    I2 = object,
    LI2 extends readonly(keyof I2 | keyof I)[] | (keyof I2 | keyof I)[] = readonly [],
    C2 = CoreOptions<I & I2>
  >(newOpts: SimplexReactorCfgOpts<I, I2, LI2>) {
    return new DerivedReactorFactory<I & I2, (LI[number] | LI2[number])[], P, C2>(this as any, newOpts as any);
  }

  interceptor(...interc: Interceptor[]) {
    this._interceptors = interc;
    return this;
  }

  interceptorByType(inter: ActionInterceptor<I>) {
    this._interceptors ??= [];
    this._interceptors.push(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I>>(a$);
      return inter(ac);
    });
    return this;
  }

  /** create SimplexReactor instance */
  create(...params: P): SimplexReactor<I, LI> {
    let service: SimplexReactor<I, LI> | undefined;

    this.reactorDefinition({
      setting: this.#setting ?? null,

      init: opt => {
        const mergedOpts = {...this.protoOptions, ...(opt ?? this.#setting)};
        if (this.protoOptions.tableFor)
          mergedOpts.tableFor = (mergedOpts.tableFor ?? []).concat(this.protoOptions.tableFor as any) as unknown as LI;
        service = new SimplexReactor<I, LI>(mergedOpts);
        (service as WithFactoryIds).factoryIds ??= [];
        (service as WithFactoryIds).factoryIds!.push(...this.#id);

        if (this._interceptors)
          service.s.prependInterceptor(...this._interceptors);
        return service;
      }
    }, ...params);
    if (service == null) {
      throw new Error(`ReactorFactory ${this.protoOptions.name}, super service constructor must be executed synchronously`);
    }
    return service;
  }

  isFactoryOf(svc: SimplexReactor<any, any>) {
    const ids = (svc as unknown as WithFactoryIds).factoryIds ?? [];
    for (let i = 0, l = ids.length; i < l; i += 3) {
      if (ids[i] === this.#id[0] && ids[i + 1] === this.#id[1]) {
        return true;
      }
    }
    return false;
  }
}

interface WithFactoryIds {
  factoryIds?: (number | string)[];
}

export interface DerivedDefContext<I, L extends readonly (keyof I)[], Pb extends readonly [...unknown[]], C> {
  setting: C | null;
  /** construct service instance, including calling "super" service definition callback */
  init: C extends CoreOptions<any> ?
      (options?: CoreOptions<I & BaseActions<I>> | null, ...superParams: Pb) => SimplexReactor<I, L> :
      (options: CoreOptions<I & BaseActions<I>>, ...superParams: Pb) => SimplexReactor<I, L>;
}
export class DerivedReactorFactory<
  I = object,
  LI extends readonly (keyof I)[] = readonly [],
  Pb extends readonly [...unknown[]] = readonly [],
  C = CoreOptions<I>,
  P extends readonly [...unknown[]] = Pb
> implements ReactorFactory<I, LI, C, P> {
  #id: [number, string];
  private reactorDefinition: (context: DerivedDefContext<I, LI, Pb, CoreOptions<I>>, ...rest: P) => void =
    (ctx, ...p) => {ctx.init(null, ...(p as unknown as Pb));};

  private _interceptors: Interceptor[] | undefined;
  private baseInterceptors: Interceptor[] | undefined;
  #setting?: C | null;
  /** Do not instantiate through constructor, instead, use BaseReactorFactory['forExtend'] */
  constructor(
    public baseFactory: ReactorFactory<Record<string, any>, readonly any[], any, Pb>,
    private superConfigUpdate: SimplexReactorCfgOpts<any, I, LI>
  ) {
    this.#id = increId();
  }

  defineReactor<CP extends unknown[]>(defCb: (context: DerivedDefContext<I, LI, Pb, C>, ...params: CP) => void) {
    const casted = this as unknown as DerivedReactorFactory<I, LI, Pb, C, CP>;
    casted.reactorDefinition = defCb as typeof casted.reactorDefinition;
    return casted;
  }

  /** New interceptors are appended to existing interceptors which is inherited from base factory */
  interceptor(...interc: Interceptor[]) {
    this._interceptors = interc;
    return this;
  }

  interceptorByType(inter: ActionInterceptor<I>) {
    this._interceptors ??= [];
    this._interceptors.push(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I>>(a$);
      return inter(ac);
    });
    return this;
  }

  interceptorForBase(...interc: Interceptor[]) {
    this.baseInterceptors = interc;
    return this;
  }

  interceptorForBaseByType(interc: ActionInterceptor<I>) {
    this.baseInterceptors ??= [];
    this.baseInterceptors.push(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I>>(a$);
      return interc(ac);
    });
    return this;
  }

  forExtend<
    I2 = object,
    LI2 extends readonly(keyof I2 | keyof I)[] | (keyof I2 | keyof I)[] = readonly [],
    C2 = CoreOptions<I & I2>
  >(newOpts: SimplexReactorCfgOpts<I, I2, LI2>) {
    return new DerivedReactorFactory<I & I2, (LI[number] | LI2[number])[], P, C2>(this as any, newOpts as any);
  }

  /** Mainly for setting debug options for later creating service instance.
   * Unlike consturctor parameter `superConfigUpdate`:
   * - this setting options will not be inherited by derived factory
   * - it does not allow set property `tableFor` which changes the "shape" of the service
  **/
  setting(opt: C | null | undefined) {
    this.#setting = opt;
    return this;
  }

  /** create SimplexReactor instance */
  create(...params: P) {
    let service: SimplexReactor<I, LI> | undefined;
    this.reactorDefinition({
      setting: this.#setting ?? null,
      init: (superOpts, ...superParam) => {
        const mergedSuperOpts = {
          ...this.superConfigUpdate,
          ...(superOpts ?? this.#setting)
        };
        if (this.superConfigUpdate.tableFor)
          mergedSuperOpts.tableFor = (mergedSuperOpts.tableFor ?? []).concat(this.superConfigUpdate.tableFor as any) as unknown as LI;
        // delete mergedSuperOpts.tableFor;
        service = this.baseFactory.setting(mergedSuperOpts)
          .create(...superParam)
          .toExtend<any, any>();
        (service as WithFactoryIds).factoryIds ??= [];
        (service as WithFactoryIds).factoryIds!.push(...this.#id);
        if (this._interceptors)
          service.s.prependInterceptor(...this._interceptors);
        if (this.baseInterceptors)
          service.s.appendInterceptorToSrc(...this.baseInterceptors);
        return service;
      }
    }, ...params);
    if (service == null) {
      throw new Error(`ReactorFactory ${this.superConfigUpdate.name}, super service constructor must be executed synchronously`);
    }
    return service;
  }

  isFactoryOf(svc: SimplexReactor<any, any>) {
    const ids = (svc as unknown as WithFactoryIds).factoryIds ?? [];
    for (let i = 0, l = ids.length; i < l; i += 3) {
      if (ids[i] === this.#id[0] && ids[i + 1] === this.#id[1]) {
        return true;
      }
    }
    return false;
  }
}

/** Get type "CoreOptions" from BaseReactorFactory or DerivedReactorFactory */
export type CreateOptsOfFac<F> = F extends BaseReactorFactory<infer I, any, any, any> ?
  CoreOptions<I> :
  F extends DerivedReactorFactory<infer I, any, any, any, any> ?
    CoreOptions<I> : unknown;

/** Get type "CoreOption" from inherited ReactorFactory and type of extend "Actions" */
export type CreateOptsOfExtendedFac<F, EI extends Record<string, any> = Record<string, never>> =
  F extends BaseReactorFactory<infer I, any, any, any> ?
    CoreOptions<I & EI> :
    F extends DerivedReactorFactory<infer I, any, any, any, any> ?
      CoreOptions<I & EI> : never;

/** Get type "SimplexReactor" from BaseReactorFactory or DerivedReactorFactory */
export type SimplexReactorOfFac<F> = F extends BaseReactorFactory<any, any, any, any> |
  DerivedReactorFactory<any, any, any, any, any> ?
  ReturnType<F['create']> :
  never;

