/// <reference types="node" />
import http from 'node:http';
import * as rx from 'rxjs';
import { ActionTypes } from '@wfh/redux-toolkit-observable/dist/rx-utils';
declare type ServerResponseMsg = {
    onRespond<K extends keyof ClientMessage>(type: K, payload: ActionTypes<ClientMessage>[K]['payload'], content: string | Buffer): void;
    /** subscribed changes */
    onChange(key: string, value: any): void;
};
export declare type ClientMessage = {
    ping(key: string): void;
    shutdownServer(): void;
    setForNonexist(key: string, value: any): void;
    delete(key: string): void;
    increase(key: string, value: number): void;
    subscribeKey(key: string): void;
    unsubscribeKey(key: string): void;
};
export declare type ServerResponseContent = Record<keyof ClientMessage, {
    success: boolean;
    error?: string;
}> & {
    setForNonexist: {
        success: boolean;
        value: unknown;
        error?: string;
    };
    increase: {
        success: boolean;
        value: unknown;
        error?: string;
    };
};
export declare type ClientActions = {
    _reconnectForSubs(): void;
    _responseEnd(req: http.ClientRequest, resContent: string | Buffer): void;
    _shutdownSelf(): void;
} & ClientMessage & ServerResponseMsg;
export declare function createClient(opts?: {
    /** default 1000 */
    reconnectWaitMs?: number;
    /** default http://localhost:14401*/
    serverEndpoint?: string;
}): {
    serverReplied<K extends keyof ClientMessage>(actType: K, predicate: (payload: ActionTypes<ClientMessage>[K]["payload"], content: string | Buffer) => boolean): Promise<{
        type: string;
        payload: [type: keyof ClientMessage, payload: unknown, content: string | Buffer];
    }>;
    dispatcher: ClientActions;
    dispatchFactory: <K_1 extends keyof ClientMessage | "_reconnectForSubs" | "_responseEnd" | "_shutdownSelf" | keyof ServerResponseMsg>(type: K_1) => ClientActions[K_1];
    action$: rx.Observable<{
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
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: [key: string, value: any];
    } | {
        type: string;
        payload: [key: string, value: number];
    } | {
        type: string;
        payload: [req: http.ClientRequest, resContent: string | Buffer];
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: [type: keyof ClientMessage, payload: unknown, content: string | Buffer];
    } | {
        type: string;
        payload: [key: string, value: any];
    }>;
    actionOfType: <T extends keyof ClientMessage | "_reconnectForSubs" | "_responseEnd" | "_shutdownSelf" | keyof ServerResponseMsg>(type: T) => rx.Observable<ActionTypes<ClientActions>[T]>;
    ofType: import("@wfh/redux-toolkit-observable/dist/rx-utils").OfTypeFn<ClientActions>;
    isActionType: <K_2 extends keyof ClientMessage | "_reconnectForSubs" | "_responseEnd" | "_shutdownSelf" | keyof ServerResponseMsg>(action: {
        type: unknown;
    }, type: K_2) => action is ActionTypes<ClientActions>[K_2];
    nameOfAction: (action: {
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
        payload: string;
    } | {
        type: string;
        payload: string;
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: [key: string, value: any];
    } | {
        type: string;
        payload: [key: string, value: number];
    } | {
        type: string;
        payload: [req: http.ClientRequest, resContent: string | Buffer];
    } | {
        type: string;
        payload: unknown;
    } | {
        type: string;
        payload: [type: keyof ClientMessage, payload: unknown, content: string | Buffer];
    } | {
        type: string;
        payload: [key: string, value: any];
    }) => keyof ClientMessage | "_reconnectForSubs" | "_responseEnd" | "_shutdownSelf" | keyof ServerResponseMsg | undefined;
};
export {};
