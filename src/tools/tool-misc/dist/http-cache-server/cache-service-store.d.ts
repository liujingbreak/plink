/// <reference types="node" />
/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import * as rx from 'rxjs';
export declare function startStore(): {
    shutdown(): void;
    started: Promise<{
        type: string;
        payload: unknown;
    }>;
};
declare type ServerResponseMsg = {
    onRespond(type: keyof ClientMessage, key: string, content: string | Buffer): void;
    /** subscribed changes */
    onChange(key: string): void;
};
declare type ClientMessage = {
    ping(key: string): void;
    setForNonexist(key: string): void;
    subscribeChange(key: string): void;
    unsubscribe(key: string): void;
    _reconnectForSubs(): void;
    _requestClose(req: http.ClientRequest): void;
    _responseEnd(req: http.ClientRequest, resContent: string | Buffer): void;
} & ServerResponseMsg;
export declare function createClient(): {
    dispatcher: ClientMessage;
    dispatchFactory: <K extends "ping" | "setForNonexist" | "subscribeChange" | "unsubscribe" | "_reconnectForSubs" | "_requestClose" | "_responseEnd" | keyof ServerResponseMsg>(type: K) => ClientMessage[K];
    action$: rx.Observable<{
        type: string;
        payload: string;
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: http.ClientRequest;
    } | {
        type: string;
        payload: [req: http.ClientRequest, resContent: string | Buffer];
    } | {
        type: string;
        payload: [type: "ping" | "setForNonexist" | "subscribeChange" | "unsubscribe" | "_reconnectForSubs" | "_requestClose" | "_responseEnd" | keyof ServerResponseMsg, key: string, content: string | Buffer];
    } | {
        type: string;
        payload: string;
    }>;
    actionOfType: <T extends "ping" | "setForNonexist" | "subscribeChange" | "unsubscribe" | "_reconnectForSubs" | "_requestClose" | "_responseEnd" | keyof ServerResponseMsg>(type: T) => rx.Observable<import("@wfh/redux-toolkit-observable/dist/rx-utils").ActionTypes<ClientMessage>[T]>;
    ofType: import("@wfh/redux-toolkit-observable/dist/rx-utils").OfTypeFn<ClientMessage>;
    isActionType: <K_1 extends "ping" | "setForNonexist" | "subscribeChange" | "unsubscribe" | "_reconnectForSubs" | "_requestClose" | "_responseEnd" | keyof ServerResponseMsg>(action: {
        type: unknown;
    }, type: K_1) => action is import("@wfh/redux-toolkit-observable/dist/rx-utils").ActionTypes<ClientMessage>[K_1];
    nameOfAction: (action: {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: http.ClientRequest;
    } | {
        type: string;
        payload: [req: http.ClientRequest, resContent: string | Buffer];
    } | {
        type: string;
        payload: [type: "ping" | "setForNonexist" | "subscribeChange" | "unsubscribe" | "_reconnectForSubs" | "_requestClose" | "_responseEnd" | keyof ServerResponseMsg, key: string, content: string | Buffer];
    } | {
        type: string;
        payload: string;
    }) => "ping" | "setForNonexist" | "subscribeChange" | "unsubscribe" | "_reconnectForSubs" | "_requestClose" | "_responseEnd" | keyof ServerResponseMsg | undefined;
};
export {};
