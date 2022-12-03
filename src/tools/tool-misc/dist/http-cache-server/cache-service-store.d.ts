/// <reference types="node" />
/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import * as rx from 'rxjs';
import { ActionTypes } from '@wfh/redux-toolkit-observable/dist/rx-utils';
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
    setForNonexist(key: string, value: any): void;
    increase(key: string, value: number): void;
    subscribeChange(key: string): void;
    unsubscribe(key: string): void;
    _reconnectForSubs(): void;
    _responseEnd(req: http.ClientRequest, resContent: string | Buffer): void;
} & ServerResponseMsg;
export declare function createClient(): {
    dispatcher: ClientMessage;
    dispatchFactory: <K extends "subscribeChange" | "_responseEnd" | "_reconnectForSubs" | "ping" | "setForNonexist" | "increase" | "unsubscribe" | keyof ServerResponseMsg>(type: K) => ClientMessage[K];
    action$: rx.Observable<{
        type: string;
        payload: [key: string, value: any];
    } | {
        type: string;
        payload: [key: string, value: number];
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: [req: http.ClientRequest, resContent: string | Buffer];
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: [type: "subscribeChange" | "_responseEnd" | "_reconnectForSubs" | "ping" | "setForNonexist" | "increase" | "unsubscribe" | keyof ServerResponseMsg, key: string, content: string | Buffer];
    } | {
        type: string;
        payload: string;
    }>;
    actionOfType: <T extends "subscribeChange" | "_responseEnd" | "_reconnectForSubs" | "ping" | "setForNonexist" | "increase" | "unsubscribe" | keyof ServerResponseMsg>(type: T) => rx.Observable<ActionTypes<ClientMessage>[T]>;
    ofType: import("@wfh/redux-toolkit-observable/dist/rx-utils").OfTypeFn<ClientMessage>;
    isActionType: <K_1 extends "subscribeChange" | "_responseEnd" | "_reconnectForSubs" | "ping" | "setForNonexist" | "increase" | "unsubscribe" | keyof ServerResponseMsg>(action: {
        type: unknown;
    }, type: K_1) => action is ActionTypes<ClientMessage>[K_1];
    nameOfAction: (action: {
        type: string;
        payload: [key: string, value: any];
    } | {
        type: string;
        payload: [key: string, value: number];
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: [req: http.ClientRequest, resContent: string | Buffer];
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: [type: "subscribeChange" | "_responseEnd" | "_reconnectForSubs" | "ping" | "setForNonexist" | "increase" | "unsubscribe" | keyof ServerResponseMsg, key: string, content: string | Buffer];
    } | {
        type: string;
        payload: string;
    }) => "subscribeChange" | "_responseEnd" | "_reconnectForSubs" | "ping" | "setForNonexist" | "increase" | "unsubscribe" | keyof ServerResponseMsg | undefined;
};
export {};
