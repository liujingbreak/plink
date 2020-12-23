/// <reference types="node" />
import { Observable } from 'rxjs';
import { Checksum } from '../fetch-types';
export interface Options {
    url: string;
    /** Name of the file to be created or replaced in remote server*/
    remoteFile: string;
    numOfNode: number;
    numOfConc: number;
    secret?: string;
}
export interface ServerMetaInfo {
    checksum: Checksum;
    id: string;
}
export declare function sendAppZip(opt?: Options, file?: string): Promise<void>;
export declare function toLines(src: Observable<Buffer>): Observable<string>;
