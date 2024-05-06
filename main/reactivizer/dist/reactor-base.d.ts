import { DuplexOptions } from './duplex';
export interface ReactorCompositeOpt<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexOptions<I & O> {
    inputTableFor?: LI;
    outputTableFor?: LO;
}
