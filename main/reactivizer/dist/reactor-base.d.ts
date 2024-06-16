import { CoreOptions } from './stream-core';
import { DuplexOptions } from './duplex';
import { InferActionsOfSmplxRctr, InferTableForSmplxRctr } from './inferred-types';
import { SimplexReactor } from './simplex-reactor';
export interface ReactorCompositeOpt<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexOptions<I & O> {
    inputTableFor?: LI;
    outputTableFor?: LO;
}
export type SimplexReactorOptions<I = Record<never, never>, LI extends readonly (keyof I)[] = readonly []> = LI['length'] extends 0 ? CoreOptions<I> & {
    tableFor?: LI;
} : CoreOptions<I> & {
    tableFor: LI;
};
export type OptionsOfSmplxRctr<R extends SimplexReactor<any, any>> = SimplexReactorOptions<InferActionsOfSmplxRctr<R>, InferTableForSmplxRctr<R>[]>;
export type SimplexReactorCfgOpts<IBase = Record<never, never>, IExt = Record<never, never>, LIExt extends readonly (keyof IExt)[] = []> = LIExt['length'] extends 0 ? CoreOptions<IBase & IExt> & {
    tableFor?: unknown[];
} : LIExt extends never[] ? CoreOptions<IBase & IExt> & {
    tableFor?: unknown[];
} : CoreOptions<IBase & IExt> & {
    tableFor: LIExt;
};
