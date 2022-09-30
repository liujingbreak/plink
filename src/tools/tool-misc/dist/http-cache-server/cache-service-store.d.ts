import * as rx from 'rxjs';
export declare function startStore(): {
    shutdown(): void;
    started: Promise<"listening">;
};
declare type ClientMessage = {
    ping(key: string): void;
    _done(type: string, key: string): void;
    setForNonexist(key: string): void;
    subscribeChange(key: string): void;
    unsubscribe(key: string): void;
};
export declare function createClient(): {
    dispatcher: ClientMessage;
    dispatchFactory: <K extends keyof ClientMessage>(type: K) => ClientMessage[K];
    action$: rx.Observable<{
        type: "ping";
        payload: string;
    } | {
        type: "_done";
        payload: [type: string, key: string];
    } | {
        type: "setForNonexist";
        payload: string;
    } | {
        type: "subscribeChange";
        payload: string;
    } | {
        type: "unsubscribe";
        payload: string;
    }>;
    actionOfType: <T extends keyof ClientMessage>(type: T) => Record<keyof ClientMessage, rx.Observable<{
        type: "ping";
        payload: string;
    } | {
        type: "_done";
        payload: [type: string, key: string];
    } | {
        type: "setForNonexist";
        payload: string;
    } | {
        type: "subscribeChange";
        payload: string;
    } | {
        type: "unsubscribe";
        payload: string;
    }>>[T];
    ofType: import("@wfh/redux-toolkit-observable/dist/rx-utils").OfTypeFn<ClientMessage>;
    isActionType: <K_1 extends keyof ClientMessage>(action: {
        type: unknown;
    }, type: K_1) => action is import("@wfh/redux-toolkit-observable/dist/rx-utils").ActionTypes<ClientMessage>[K_1];
};
export {};
