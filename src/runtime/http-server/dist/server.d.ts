/// <reference types="node" />
import * as http from 'http';
import * as https from 'https';
import * as rx from 'rxjs';
export declare const serverCreated$: rx.ReplaySubject<http.Server | https.Server>;
export declare function activate(): void;
export declare function deactivate(): void;
