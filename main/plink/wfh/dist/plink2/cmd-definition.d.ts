import * as rx from 'rxjs';
import commander from 'commander';
export declare function define(rootDir: string, onShutdown: () => void): rx.Observable<commander.Command>;
