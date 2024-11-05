import {SimplexReactorOptions, SimplexReactorCfgOpts} from './reactor-base';
import {CoreOptions, Interceptor} from './stream-core';
import {ActionInterceptor, RxController2} from './control2';
import {SimplexReactor} from './simplex-reactor';
import {ActionDispenser} from './stream-dispense';

export interface ReactorFactory<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly []
> {
  create(instanceOpts?: CoreOptions<I>): SimplexReactor<I, LI>;
}

export class BaseReactorFactory<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly []
> implements ReactorFactory<I, LI> {
  private reactorsFac: (service: SimplexReactor<I, LI>) => void = () => {};
  private _interceptors: Interceptor[] | undefined;

  constructor(public protoOptions: SimplexReactorOptions<I, LI>) {
  }
  defineReactor(fac: (service: SimplexReactor<I, LI>) => void) {
    this.reactorsFac = fac;
    return this;
  }
  forExtend<
    I2 = Record<never, never>,
    LI2 extends readonly(keyof I2)[] | (keyof I2)[] = readonly []
  >(newOpts: SimplexReactorCfgOpts<I, I2, LI2>): DerivedReactorFactory<I2, LI2, I, LI > {
    return new DerivedReactorFactory<I2, LI2, I, LI>(this, newOpts);
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
  create(instanceOpts?: CoreOptions<I>): SimplexReactor<I, LI> {
    const service = new SimplexReactor<I, LI>(this.protoOptions ?
      {...this.protoOptions, ...instanceOpts} :
      instanceOpts as any);
    if (this._interceptors)
      service.s.interceptorList$.next(this._interceptors);
    this.reactorsFac(service);
    return service;
  }
}

export class DerivedReactorFactory<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly [],
  Ib = Record<never, never>,
  LIb extends readonly (keyof Ib)[] | (keyof Ib)[] = readonly []
> implements ReactorFactory<I & Ib, readonly (LI[number] | LIb[number])[]> {
  private reactorsFac: (service: SimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>) => void = () => {};
  private _interceptors: Interceptor[] | undefined;
  private baseInterceptors: Interceptor[] | undefined;
  private featTableForList: LI;
  private otherFeatOpts: CoreOptions<I & Ib> | undefined;
  constructor(public baseFactory: ReactorFactory<Ib, LIb>, featOptions?: SimplexReactorCfgOpts<Ib, I, LI>) {
    this.featTableForList = featOptions?.tableFor as LI;
    if (featOptions) {
      this.otherFeatOpts = {...featOptions} as CoreOptions<I & Ib>;
      delete (this.otherFeatOpts as typeof featOptions).tableFor;
    }
  }
  defineReactor(fac: (service: SimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>) => void) {
    this.reactorsFac = fac;
    return this;
  }

  /** New interceptors are appended to existing interceptors which is inherited from base factory */
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
    LI2 extends readonly(keyof I2)[] | (keyof I2)[] = readonly []
  >(newOpts: SimplexReactorCfgOpts<I & Ib, I2, LI2>): DerivedReactorFactory<I2, LI2, I & Ib, readonly (LI[number] | LIb[number])[]> {
    return new DerivedReactorFactory<
    I2, LI2, I & Ib, readonly (LI[number] | LIb[number])[]
    >(this, newOpts);
  }
  create(instanceOpts?: CoreOptions<I & Ib>): SimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mixedOpts = {
      ...this.otherFeatOpts,
      ...instanceOpts
    } as any;
    const service = this.baseFactory.create(mixedOpts).config<I, LI>({
      tableFor: this.featTableForList
    } as any).forExtend();

    const {s} = service;
    if (this._interceptors) {
      s.prependInterceptor(...this._interceptors);
    }
    if (this.baseInterceptors) {
      s.appendInterceptorToSrc(...this.baseInterceptors);
    }

    this.reactorsFac(service);
    return service;
  }
}
