/// <reference types="node" />
/**
 * For test purpose, run:
 *
drcp run ts/content-deployer/cd-client.ts#sendAppZip assets-processer --url http://localhost:14333/_install --app-version 1 --app-name test --num-of-conc 1 --num-of-node 2 --file ../webui-static.zip
drcp run ts/content-deployer/cd-client.ts#sendAppZip assets-processer --url https://credit-service.dev.bkjk.com/_install --app-version 1 --app-name bcl --num-of-conc 2 --num-of-node 1 --file ../webui-static.zip
drcp run ts/content-deployer/cd-client.ts#sendAppZip assets-processer --url https://credit-service.test.bkjk.com/_install --app-version 1 --app-name bcl --num-of-conc 2 --num-of-node 1 --file ../webui-static.zip

*/
import { Observable } from 'rxjs';
import { Checksum } from '../fetch-types';
export interface Options {
    url: string;
    appName: string;
    version: number;
    numOfNode: number;
    numOfConc: number;
}
export interface ServerMetaInfo {
    checksum: Checksum;
    id: string;
}
export declare function sendAppZip(opt?: Options, file?: string): Promise<unknown>;
export declare function sendRequest(opt: Options, buffer?: Buffer): Promise<string>;
export declare function toLines(src: Observable<Buffer>): Observable<string>;
