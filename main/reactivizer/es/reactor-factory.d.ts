import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { CoreOptions, Interceptor } from './stream-core';
import { ActionInterceptor } from './control2';
import { SimplexReactor, BaseActions } from './simplex-reactor';
export interface ReactorFactory<I = Record<string, never>, LI extends readonly (keyof I)[] = [], C = CoreOptions<I>, P extends readonly [...unknown[]] = []> {
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
    init: C extends CoreOptions<any> ? (options?: CoreOptions<I & BaseActions<I>> | null) => SimplexReactor<I, L> : (options: CoreOptions<I & BaseActions<I>>) => SimplexReactor<I, L>;
}
export declare class BaseReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly [], C = CoreOptions<I>, P extends [...unknown[]] = []> implements ReactorFactory<I, LI, C, P> {
    #private;
    protoOptions: SimplexReactorOptions<I, LI>;
    private reactorDefinition;
    private _interceptors;
    constructor(protoOptions: SimplexReactorOptions<I, LI>);
    /** Define message subscription in this method will be able to be inherited by any derived SimplexRectors
     **/
    defineReactor<PA extends any[]>(defCb: (context: DefContext<I, LI, C>, ...params: PA) => void): BaseReactorFactory<I, LI, C, PA>;
    /** Mainly for setting debug options for later creating service instance.
     * Unlike consturctor parameter `protoOptions`:
     * - this setting options will not be inherited by derived factory
     * - it does not allow set property `tableFor` which changes the "shape" of the service
    **/
    setting(opt: C | null | undefined): this;
    forExtend<I2 = Record<never, never>, LI2 extends readonly (keyof I2 | keyof I)[] | (keyof I2 | keyof I)[] = readonly [], C2 = CoreOptions<I & I2>>(newOpts: SimplexReactorCfgOpts<I, I2, LI2>): DerivedReactorFactory<I & I2, (LI[number] | LI2[number])[], P, C2, P>;
    interceptor(...interc: Interceptor[]): this;
    interceptorByType(inter: ActionInterceptor<I>): this;
    /** create SimplexReactor instance */
    create(...params: P): SimplexReactor<I, LI>;
    isFactoryOf(svc: SimplexReactor<any, any>): boolean;
}
export interface DerivedDefContext<I, L extends readonly (keyof I)[], Pb extends readonly [...unknown[]], C> {
    setting: C | null;
    /** construct service instance, including calling "super" service definition callback */
    init: C extends CoreOptions<any> ? (options?: CoreOptions<I & BaseActions<I>> | null, ...superParams: Pb) => SimplexReactor<I, L> : (options: CoreOptions<I & BaseActions<I>>, ...superParams: Pb) => SimplexReactor<I, L>;
}
export declare class DerivedReactorFactory<I = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], Pb extends readonly [...unknown[]] = readonly [], C = CoreOptions<I>, P extends readonly [...unknown[]] = Pb> implements ReactorFactory<I, LI, C, P> {
    #private;
    baseFactory: ReactorFactory<Record<string, any>, readonly any[], any, Pb>;
    private superConfigUpdate;
    private reactorDefinition;
    private _interceptors;
    private baseInterceptors;
    /** Do not instantiate through constructor, instead, use BaseReactorFactory['forExtend'] */
    constructor(baseFactory: ReactorFactory<Record<string, any>, readonly any[], any, Pb>, superConfigUpdate: SimplexReactorCfgOpts<any, I, LI>);
    defineReactor<CP extends unknown[]>(defCb: (context: DerivedDefContext<I, LI, Pb, C>, ...params: CP) => void): DerivedReactorFactory<I, LI, Pb, C, CP>;
    /** New interceptors are appended to existing interceptors which is inherited from base factory */
    interceptor(...interc: Interceptor[]): this;
    interceptorByType(inter: ActionInterceptor<I>): this;
    interceptorForBase(...interc: Interceptor[]): this;
    interceptorForBaseByType(interc: ActionInterceptor<I>): this;
    forExtend<I2 = Record<never, never>, LI2 extends readonly (keyof I2 | keyof I)[] | (keyof I2 | keyof I)[] = readonly [], C2 = CoreOptions<I & I2>>(newOpts: SimplexReactorCfgOpts<I, I2, LI2>): DerivedReactorFactory<I & I2, (LI[number] | LI2[number])[], P, C2, P>;
    /** Mainly for setting debug options for later creating service instance.
     * Unlike consturctor parameter `superConfigUpdate`:
     * - this setting options will not be inherited by derived factory
     * - it does not allow set property `tableFor` which changes the "shape" of the service
    **/
    setting(opt: C | null | undefined): this;
    /** create SimplexReactor instance */
    create(...params: P): SimplexReactor<I, LI>;
    isFactoryOf(svc: SimplexReactor<any, any>): boolean;
}
/** Get type "CoreOptions" from BaseReactorFactory or DerivedReactorFactory */
export type CreateOptsOfFac<F> = F extends BaseReactorFactory<infer I, any, any, any> ? CoreOptions<I> : F extends DerivedReactorFactory<infer I, any, any, any, any> ? CoreOptions<I> : unknown;
/** Get type "CoreOption" from inherited ReactorFactory and type of extend "Actions" */
export type CreateOptsOfExtendedFac<F, EI extends Record<string, any> = Record<string, never>> = F extends BaseReactorFactory<infer I, any, any, any> ? CoreOptions<I & EI> : F extends DerivedReactorFactory<infer I, any, any, any, any> ? CoreOptions<I & EI> : never;
/** Get type "SimplexReactor" from BaseReactorFactory or DerivedReactorFactory */
export type SimplexReactorOfFac<F> = F extends BaseReactorFactory<any, any, any, any> | DerivedReactorFactory<any, any, any, any, any> ? ReturnType<F['create']> : never;
