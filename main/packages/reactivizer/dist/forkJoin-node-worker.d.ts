import * as rx from 'rxjs';
import { ActionFunctions } from './control';
import { ReactorComposite } from './epic';
import { ForkWorkerInput, ForkWorkerOutput } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>>(): ReactorComposite<I & ForkWorkerInput, ForkWorkerOutput<I>>;
export declare function reativizeRecursiveFuncs<I extends ActionFunctions, O extends ActionFunctions, F extends {
    [s: string]: (...a: any[]) => any;
}>(ctx: ReactorComposite<I, O>, fObject: F): ReactorComposite<{ [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>, callerActionId: number) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: (callerActionId: number) => void; } & I & F, { [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>, callerActionId: number) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: (callerActionId: number) => void; } & O>;
