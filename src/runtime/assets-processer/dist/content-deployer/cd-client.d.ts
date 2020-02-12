/// <reference types="node" />
import { Observable } from 'rxjs';
import { Checksum } from '../fetch-types';
export interface Options {
    url: string;
    file: string;
    numOfNode: number;
    numOfConc: number;
    secret?: string;
}
export interface ServerMetaInfo {
    checksum: Checksum;
    id: string;
}
export declare function sendAppZip(opt?: Options, file?: string): Promise<unknown>;
export declare function toLines(src: Observable<Buffer>): Observable<string>;
