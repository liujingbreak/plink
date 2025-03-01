import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { CoreOptions, Interceptor } from './stream-core';
import { ActionInterceptor } from './control2';
import { SimplexReactor, DerivedSimplexReactor } from './simplex-reactor';
export interface ReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly [], P extends readonly [...any[]] = [...any[]]> {
    /** create SimplexReactor instance */
    create(...params: P): SimplexReactor<I, LI>;
    _create(overrideOpts: (currOpts: SimplexReactorOptions<I, LI>) => SimplexReactorOptions<I, LI>, params: P): SimplexReactor<I, LI>;
}
export declare class BaseReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly [], P extends [...any[]] = [...any[]]> implements ReactorFactory<I, LI, P> {
    protoOptions: SimplexReactorOptions<I, LI>;
    private reactorDefinition;
    private _interceptors;
    constructor(protoOptions: SimplexReactorOptions<I, LI>);
    /** Define message subscription in this method will be able to be inherited by any derived SimplexRectors
     **/
    defineReactor<PA extends P = P>(fac: (init: (overrideOpts?: CoreOptions<I>) => SimplexReactor<I, LI>, ...params: PA) => void): BaseReactorFactory<I, LI, PA>;
    forExtend<I2 = Record<never, never>, LI2 extends readonly (keyof I2 | keyof I)[] | (keyof I2 | keyof I)[] = readonly [], P2 extends readonly [...any[]] = [...any[]]>(newOpts?: SimplexReactorCfgOpts<I, I2, LI2>): DerivedReactorFactory<I2, LI2, P2, I, LI, P>;
    interceptor(...interc: Interceptor[]): this;
    interceptorByType(inter: ActionInterceptor<I>): this;
    /** create SimplexReactor instance */
    create(...params: P): SimplexReactor<I, LI>;
    /** do not call this method directly, use create() instead */
    _create(overrideOpts: (currOpts: SimplexReactorOptions<I, LI>) => SimplexReactorOptions<I, LI>, param: P): SimplexReactor<I, LI>;
}
export declare class DerivedReactorFactory<I = Record<never, never>, LI extends readonly (keyof I | keyof Ib)[] | (keyof I | keyof Ib)[] = readonly [], P extends readonly [...any[]] = [...any[]], Ib = Record<never, never>, LIb extends readonly (keyof Ib)[] | (keyof Ib)[] = readonly [], Pb extends readonly [...any[]] = [...any[]]> implements ReactorFactory<I & Ib, readonly (LI[number] | LIb[number])[], P> {
    baseFactory: ReactorFactory<Ib, LIb, Pb>;
    private reactorDefinition;
    private _interceptors;
    private baseInterceptors;
    private featTableForList;
    private featOpts;
    constructor(baseFactory: ReactorFactory<Ib, LIb, Pb>, featOptions?: SimplexReactorCfgOpts<Ib, I, LI>);
    defineReactor<PA extends P = P>(fac: (createSuper: (createOpts?: CoreOptions<I & Ib> | undefined | null, ...superParam: Pb) => DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>, ...params: PA) => void): DerivedReactorFactory<I, LI, PA, Ib, LIb, Pb>;
    /** New interceptors are appended to existing interceptors which is inherited from base factory */
    interceptor(...interc: Interceptor[]): this;
    interceptorByType(inter: ActionInterceptor<I & Ib>): this;
    interceptorForBase(...interc: Interceptor[]): this;
    interceptorForBaseByType(interc: ActionInterceptor<I & Ib>): this;
    forExtend<I2 = Record<never, never>, LI2 extends readonly (keyof I2)[] | (keyof I2)[] = readonly [], P2 extends readonly [...any[]] = [...any[]]>(newOpts: SimplexReactorCfgOpts<I & Ib, I2, LI2>): DerivedReactorFactory<I2, LI2, P2, I & Ib, readonly (LI[number] | LIb[number])[], P>;
    /** do not call this method directly, use create() instead */
    _create(overrideOpts: (currOpts: SimplexReactorOptions<I & Ib, readonly (LI[number] | LIb[number])[]>) => SimplexReactorOptions<I & Ib, readonly (LI[number] | LIb[number])[]>, params: P): DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>;
    /** create SimplexReactor instance */
    create(...params: P): DerivedSimplexReactor<I & Ib, readonly (LI[number] | LIb[number])[]>;
}
/** Used in paramter type definition of ReactorFactory["defineReactor"] to avoid cyclic reference problem `CreateOptsOfFac` */
export type CreateOptsInDef<I, BaseFactory = never> = BaseFactory extends never ? CoreOptions<I> : CoreOptions<BaseFactory extends ReactorFactory<infer Ib, any, any> ? Ib & I : I>;
export type CreateOptsOfFac<F> = F extends ReactorFactory<infer I, any, any> ? CoreOptions<I> : unknown;
export type SimplexReactorOfFac<F> = F extends DerivedReactorFactory<any, any, any, any, any, any> ? ReturnType<F['_create']> : F extends BaseReactorFactory<any, any, any> ? ReturnType<F['_create']> : unknown;
