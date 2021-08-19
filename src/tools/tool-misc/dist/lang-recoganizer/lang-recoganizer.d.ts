import * as rx from 'rxjs';
interface PositionInfo {
    start: number;
    end: number;
}
declare const childStepActions: {
    mark(laNum: number): void;
    replay(position: number): void;
    process(payload: {
        d: any;
        i: number;
    }): void;
    sucess<R extends PositionInfo>(result: R): void;
    failed(reason: string[]): void;
};
declare type Action = {
    type: keyof typeof childStepActions;
    payload: Parameters<(typeof childStepActions)[keyof typeof childStepActions]>;
};
declare type ActionByType = {
    [K in keyof typeof childStepActions]: rx.Observable<(typeof childStepActions)[K] extends (payload: infer P) => void ? {
        payload: P;
        type: K;
    } : unknown>;
};
export declare function splitActionByType(action$: rx.Observable<Action>): ActionByType;
declare function createStep<T>(interceptor?: () => rx.OperatorFunction<Action, Action>): {
    dispatcher: {
        mark: (laNum: number) => void;
        replay: (position: number) => void;
        process: (payload: {
            d: any;
            i: number;
        }) => void;
        sucess: <R extends PositionInfo>(result: R) => void;
        failed: (reason: string[]) => void;
    };
    actions: rx.Observable<Action>;
};
declare type StepFactory = () => ReturnType<typeof createStep>;
/**
 * simplest comparison step
 * @param expectStr
 * @returns
 */
export declare function cmp<T>(...expectStr: T[]): () => {
    dispatcher: {
        mark: (laNum: number) => void;
        replay: (position: number) => void;
        process: (payload: {
            d: any;
            i: number;
        }) => void;
        sucess: <R extends PositionInfo>(result: R) => void;
        failed: (reason: string[]) => void;
    };
    actions: rx.Observable<Action>;
};
/** scope step */
export declare function scope<T>(name: string, stepFactories: (StepFactory)[], opts?: {
    onSuccess(children: PositionInfo[]): any;
}): StepFactory;
/** Choice */
export declare function choice(laNum?: number, ...choiceFactories: (StepFactory)[]): () => {
    dispatcher: {
        mark: (laNum: number) => void;
        replay: (position: number) => void;
        process: (payload: {
            d: any;
            i: number;
        }) => void;
        sucess: <R extends PositionInfo>(result: R) => void;
        failed: (reason: string[]) => void;
    };
    actions: rx.Observable<Action>;
};
interface LoopOptions {
    laNum?: number;
    minTimes?: number;
    maxTimes?: number;
}
/** Loop */
export declare function loop(factory: StepFactory, opts?: LoopOptions): () => {
    dispatcher: {
        mark: (laNum: number) => void;
        replay: (position: number) => void;
        process: (payload: {
            d: any;
            i: number;
        }) => void;
        sucess: <R extends PositionInfo>(result: R) => void;
        failed: (reason: string[]) => void;
    };
    actions: rx.Observable<Action>;
};
export declare function parse<T>(stateMachine: StepFactory, debug?: boolean): (input$: rx.Observable<T>) => rx.Observable<{
    payload: PositionInfo;
    type: "sucess";
} | {
    payload: string[];
    type: "failed";
}>;
export declare function test(): void;
export {};
