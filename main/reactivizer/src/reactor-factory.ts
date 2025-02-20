import {SimplexReactorOptions, SimplexReactorCfgOpts} from './reactor-base';
import {CoreOptions, Interceptor} from './stream-core';
import {ActionInterceptor, RxController2} from './control2';
import {SimplexReactor, DerivedSimplexReactor} from './simplex-reactor';
import {ActionDispenser} from './stream-dispense';

export interface ReactorFactory<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly [],
  P extends readonly [...any[]] = [...any[]]
> {
  create(...params: P): SimplexReactor<I, LI>;
  _create(overrideOpts: (currOpts: SimplexReactorOptions<I, LI>) => SimplexReactorOptions<I, LI>, params: P): SimplexReactor<I, LI>;
}

export class BaseReactorFactory<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly [],
  P extends [...any[]] = [...any[]]
> implements ReactorFactory<I, LI, P> {
  private reactorDefinition: (createService: (opts?: CoreOptions<I>) => SimplexReactor<I, LI>, ...params: P) => void = (init, ...p) => { init(...p); };
  private _interceptors: Interceptor[] | undefined;

  constructor(public protoOptions: SimplexReactorOptions<I, LI>) {
  }
  /** Define message subscription in this method will be able to be inherited by any derived SimplexRectors
   **/
  defineReactor<PA extends P = P>(fac: (init: (overrideOpts?: CoreOptions<I>) => SimplexReactor<I, LI>, ...params: PA) => void) {
    this.reactorDefinition = fac as typeof this.reactorDefinition;
    return this as unknown as BaseReactorFactory<I, LI, PA>;
  }
  forExtend<
    I2 = Record<never, never>,
    LI2 extends readonly(keyof I2 | keyof I)[] | (keyof I2 | keyof I)[] = readonly [],
    P2 extends readonly [...any[]] = [...any[]]
  >(newOpts?: SimplexReactorCfgOpts<I, I2, LI2>) {
    return new DerivedReactorFactory<I2, LI2, P2, I, LI, P>(this, newOpts);
  }

  interceptor(...interc: Interceptor[]) {
    this._interceptors = interc;
    return this;
  }
  interceptorByType(inter: ActionInterceptor<I>) {
    if (this._interceptors == null)
      this._interceptors = [];
    this._interceptors.push(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I>>(a$);
      return inter(ac);
    });
    return this;
  }
  create(...params: P): SimplexReactor<I, LI> {
    return this._create(a => a, params);
  }
  /** do not call this method directly, use create() instead */
  _create(overrideOpts: (currOpts: SimplexReactorOptions<I, LI>) => SimplexReactorOptions<I, LI>, param: P): SimplexReactor<I, LI> {
    let service: SimplexReactor<I, LI> | undefined;

    this.reactorDefinition(instanceOpts => {
      const mergedOpts = this.protoOptions ?
        {...this.protoOptions, ...instanceOpts} :
        instanceOpts as typeof this.protoOptions;

      service = new SimplexReactor<I, LI>(overrideOpts(mergedOpts));

      if (this._interceptors)
        service.s.prependInterceptor(...this._interceptors);
      return service;
    }, ...param);

    return service!;
  }
}

export class DerivedReactorFactory<
  I = Record<never, never>,
  LI extends readonly (keyof I | keyof Ib)[] | (keyof I | keyof Ib)[] = readonly [],
  P extends readonly [...any[]] = [...any[]],
  Ib = Record<never, never>,
  LIb extends readonly (keyof Ib)[] | (keyof Ib)[] = readonly [],
  Pb extends readonly [...any[]] = [...any[]]
> implements ReactorFactory<I & Ib, readonly (LI[number] | LIb[number])[], P> {
  private reactorDefinition: (
    getService: (
      overrideOpts: CoreOptions<I & Ib> | undefined,
      ...superParam: Pb
    ) => DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>,
    ...params: P
  ) => void = (init, ...p) => { (init as any)(); };
  private _interceptors: Interceptor[] | undefined;
  private baseInterceptors: Interceptor[] | undefined;
  private featTableForList: LI;
  private featOpts: CoreOptions<I & Ib> | undefined;
  constructor(public baseFactory: ReactorFactory<Ib, LIb, Pb>, featOptions?: SimplexReactorCfgOpts<Ib, I, LI>) {
    this.featTableForList = featOptions?.tableFor as LI;
    if (featOptions) {
      this.featOpts = {...featOptions} as CoreOptions<I & Ib>;
      delete (this.featOpts as typeof featOptions).tableFor;
    }
  }
  defineReactor<PA extends P = P>( fac: (
    createSuper: (
      createOpts?: CoreOptions<I & Ib> | undefined | null,
      ...superParam: Pb
    ) => DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>,
    ...params: PA
  ) => void) {
    this.reactorDefinition = fac as typeof this.reactorDefinition;
    return this as DerivedReactorFactory<I, LI, PA, Ib, LIb, Pb>;
  }

  /** New interceptors are appended to existing interceptors which is inherited from base factory */
  interceptor(...interc: Interceptor[]) {
    this._interceptors = interc;
    return this;
  }
  interceptorByType(inter: ActionInterceptor<I & Ib>) {
    if (this._interceptors == null)
      this._interceptors = [];
    this._interceptors.push(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I & Ib>>(a$);
      return inter(ac);
    });
    return this;
  }
  interceptorForBase(...interc: Interceptor[]) {
    this.baseInterceptors = interc;
    return this;
  }
  interceptorForBaseByType(interc: ActionInterceptor<I & Ib>) {
    if (this.baseInterceptors == null)
      this.baseInterceptors = [];
    this.baseInterceptors.push(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I & Ib>>(a$);
      return interc(ac);
    });
    return this;
  }
  forExtend<
    I2 = Record<never, never>,
    LI2 extends readonly(keyof I2)[] | (keyof I2)[] = readonly [],
    P2 extends readonly [...any[]] = [...any[]]
  >(newOpts: SimplexReactorCfgOpts<I & Ib, I2, LI2>): DerivedReactorFactory<I2, LI2, P2, I & Ib, readonly (LI[number] | LIb[number])[], P> {
    return new DerivedReactorFactory<
    I2, LI2, P2,
    I & Ib, readonly (LI[number] | LIb[number])[], P
    >(this, newOpts);
  }
  /** do not call this method directly, use create() instead */
  _create(overrideOpts: (
    currOpts: SimplexReactorOptions<I & Ib, readonly (LI[number] | LIb[number])[]>
  ) => SimplexReactorOptions<I & Ib, readonly (LI[number] | LIb[number])[]>,
  params: P): DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]> {
    let service: DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>;
    this.reactorDefinition((instanceOpts, ...superParam) => {
      const mixed = {
        ...this.featOpts,
        ...instanceOpts
      };
      service = this.baseFactory._create(
        baseOpts => overrideOpts(Object.assign(baseOpts, mixed) as any) as any,
        superParam
      ).config<I, LI>({
        tableFor: this.featTableForList
      } as any).forExtend();
      if (this._interceptors)
        service.s.prependInterceptor(...this._interceptors);
      if (this.baseInterceptors)
        service.s.appendInterceptorToSrc(...this.baseInterceptors);
      return service;
    }, ...params);
    return service!;
  }
  create(...params: P) {
    return this._create(a => a, params);
  }
}

/** Used in paramter type definition of ReactorFactory["defineReactor"] to avoid cyclic reference problem `CreateOptsOfFac` */
export type CreateOptsInDef<I, BaseFactory = never> = BaseFactory extends never ?
  CoreOptions<I> : CoreOptions<
  BaseFactory extends ReactorFactory<infer Ib, any, any> ?
    Ib & I :
    I
  >;
export type CreateOptsOfFac<F> = F extends ReactorFactory<infer I, any, any> ?
  CoreOptions<I> : unknown;
export type SimplexReactorOfFac<F> = F extends DerivedReactorFactory<any, any, any, any, any, any> ?
  ReturnType<F['_create']> :
  F extends BaseReactorFactory<any, any, any> ? ReturnType<F['_create']> : unknown;

