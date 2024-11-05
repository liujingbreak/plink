import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { CoreOptions, Interceptor } from './stream-core';
import { ActionInterceptor } from './control2';
import { SimplexReactor } from './simplex-reactor';
export interface ReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly []> {
    create(instanceOpts?: CoreOptions<I>): SimplexReactor<I, LI>;
}
export declare class BaseReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly []> implements ReactorFactory<I, LI> {
    protoOptions: SimplexReactorOptions<I, LI>;
    private reactorsFac;
    private _interceptors;
    constructor(protoOptions: SimplexReactorOptions<I, LI>);
    defineReactor(fac: (service: SimplexReactor<I, LI>) => void): this;
    forExtend<I2 = Record<never, never>, LI2 extends readonly (keyof I2)[] | (keyof I2)[] = readonly []>(newOpts: SimplexReactorCfgOpts<I, I2, LI2>): DerivedReactorFactory<I2, LI2, I, LI>;
    interceptor(...interc: Interceptor[]): this;
    interceptorByType(inter: ActionInterceptor<I>): this;
    create(instanceOpts?: CoreOptions<I>): SimplexReactor<I, LI>;
}
export declare class DerivedReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly [], Ib = Record<never, never>, LIb extends readonly (keyof Ib)[] | (keyof Ib)[] = readonly []> implements ReactorFactory<I & Ib, readonly (LI[number] | LIb[number])[]> {
    baseFactory: ReactorFactory<Ib, LIb>;
    private reactorsFac;
    private _interceptors;
    private baseInterceptors;
    private featTableForList;
    private otherFeatOpts;
    constructor(baseFactory: ReactorFactory<Ib, LIb>, featOptions?: SimplexReactorCfgOpts<Ib, I, LI>);
    defineReactor(fac: (service: SimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>) => void): this;
    /** New interceptors are appended to existing interceptors which is inherited from base factory */
    interceptor(...interc: Interceptor[]): this;
    interceptorByType(inter: ActionInterceptor<I>): this;
    interceptorForBase(...interc: Interceptor[]): this;
    interceptorForBaseByType(interc: ActionInterceptor<I & Ib>): this;
    forExtend<I2 = Record<never, never>, LI2 extends readonly (keyof I2)[] | (keyof I2)[] = readonly []>(newOpts: SimplexReactorCfgOpts<I & Ib, I2, LI2>): DerivedReactorFactory<I2, LI2, I & Ib, readonly (LI[number] | LIb[number])[]>;
    create(instanceOpts?: CoreOptions<I & Ib>): SimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>;
}
