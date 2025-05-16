import * as rx from 'rxjs';
import { Action, ActionMeta, InferPayload } from './stream-core';
import { RxController2 } from './control2';
export declare class SingleActionInterceptor<I, K extends keyof I = keyof I> {
    private s;
    private meta;
    private forkStream;
    private emitAction;
    private payload;
    constructor(s: RxController2<I>, meta: ActionMeta);
    changePayload(...overridePayload: InferPayload<I[K]>): this;
    dp(): void;
    /** observe messages related to interecpted action and
    * dipatch intercepted action back to base stream
    **/
    od<Actions extends ([ActionMeta, ...any[]] | Action<any>)[]>(...moreMessages: {
        [Idx in keyof Actions]: rx.Observable<Actions[Idx]>;
    }): {
        [Idx in keyof Actions]: rx.Observable<Actions[Idx]>;
    };
}
