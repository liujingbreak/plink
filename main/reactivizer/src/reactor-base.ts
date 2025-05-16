import {CoreOptions} from './base-types';
import {DuplexOptions} from './duplex';
import {InferActionsOfSmplxRctr} from './inferred-types';
import {SimplexReactor, BaseActions} from './simplex-reactor';

export interface ReactorCompositeOpt<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> extends DuplexOptions<I & O> {
  inputTableFor?: LI;
  outputTableFor?: LO;
}

/** Get type "CoreOption" from types of "Actions" and "tableFor" */
export type SimplexReactorOptions<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] = []
> = LI['length'] extends 0 ?
  CoreOptions<I & BaseActions<I>> & {tableFor?: readonly []} :
  CoreOptions<I & BaseActions<I>> & {tableFor: LI};

/** Get type "CoreOption" from type "SimplexReactor" */
export type OptionsOfSmplxRctr<R extends SimplexReactor<any, any>> =
  SimplexReactorOptions<R extends SimplexReactor<infer I, any> ? I : never,
    R extends SimplexReactor<any, infer LI> ? LI : never
  >;

/** SimplexReactor['config'] parameter type */
export type SimplexReactorCfgOpts<
  IBase = Record<never, never>,
  IExt = Record<never, never>,
  LIExt extends readonly (keyof IExt | keyof IBase)[] = []
> = LIExt['length'] extends 0 ?
  CoreOptions<IBase & BaseActions<IBase & IExt> & IExt> & {tableFor?: readonly []} :
    CoreOptions<IBase & IExt & BaseActions<IBase & IExt>> & {tableFor: LIExt};

/** Get SimplexReactor['config'] parameter type from an inherited SimplexRectors type */
export type OptionsOfExtendSmplxRctr<
  Base extends SimplexReactor<any, any>,
  I,
  LI extends readonly (keyof I)[] = []
> = SimplexReactorCfgOpts<InferActionsOfSmplxRctr<Base>, I, LI>;

/** Get type "CoreOption" from an inherited SimplexReactor */
export type CoreOptsOfExtSmplxRctr<
  Base extends SimplexReactor<any, any>,
  I = Record<never, never>
> = CoreOptions<InferActionsOfSmplxRctr<Base> & I>;
