/// <reference types="node" />
import * as http from 'http';
import * as https from 'https';
import * as rx from 'rxjs';
export declare const serverCreated$: rx.ReplaySubject<https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>>;
export declare function activate(): void;
export declare function deactivate(): void;
