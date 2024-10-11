import { CoreOptions } from './stream-core';
import { DuplexOptions } from './duplex';
import { InferActionsOfSmplxRctr } from './inferred-types';
import { SimplexReactor, BaseActions } from './simplex-reactor';
export interface ReactorCompositeOpt<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexOptions<I & O> {
    inputTableFor?: LI;
    outputTableFor?: LO;
}
export type SimplexReactorOptions<I = Record<never, never>, LI extends readonly (keyof I)[] = readonly []> = LI['length'] extends 0 ? CoreOptions<I & BaseActions<I>> & {
    tableFor?: LI;
} : CoreOptions<I & BaseActions<I>> & {
    tableFor: LI;
};
export type OptionsOfSmplxRctr<R extends SimplexReactor<any, any>> = SimplexReactorOptions<R extends SimplexReactor<infer I, any> ? I : never, R extends SimplexReactor<any, infer LI> ? LI : never>;
export type SimplexReactorCfgOpts<IBase = Record<never, never>, IExt = Record<never, never>, LIExt extends readonly (keyof IExt)[] = []> = LIExt['length'] extends 0 ? CoreOptions<IBase & BaseActions<IBase & IExt> & IExt> & {
    tableFor?: never[];
} : LIExt extends never[] ? CoreOptions<IBase & IExt & BaseActions<IBase & IExt>> & {
    tableFor?: unknown[];
} : CoreOptions<IBase & IExt & BaseActions<IBase & IExt>> & {
    tableFor: LIExt;
};
export type OptionsOfExtendSmplxRctr<R extends SimplexReactor<any, any>, I, LI extends (readonly (keyof I)[] | (keyof I)[]) = []> = SimplexReactorCfgOpts<InferActionsOfSmplxRctr<R>, I, LI>;
export type CoreOptsOfExtSmplxRctr<R extends SimplexReactor<any, any>, I = Record<never, never>> = CoreOptions<InferActionsOfSmplxRctr<R> & I>;
