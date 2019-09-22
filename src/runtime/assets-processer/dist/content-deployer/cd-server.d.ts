import { Application } from 'express';
import { ImapManager } from '../fetch-remote-imap';
export declare function activate(app: Application, imap: ImapManager): Promise<void>;
