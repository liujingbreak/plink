/// <reference types="node" />
import { Response } from 'express';
export declare function createBufferResponse(originRes: Response, onFinish: (data: Buffer | string | any, send: () => void) => void): Response;
