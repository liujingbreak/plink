import zlib from 'zlib';
import {IncomingMessage} from 'http';
import { pipeline, Writable } from 'stream';

export async function readCompressedResponse(clientResponse: IncomingMessage, output: Writable) {
  return new Promise<void>((resolve, reject) => {
    const onError: (err: NodeJS.ErrnoException | null) => void = err => {
      if (err)
        return reject(err);
      resolve();
    };

    switch (clientResponse.headers['content-encoding']) {
      case 'br':
        pipeline(clientResponse, zlib.createBrotliDecompress(), output, onError);
        break;
      // Or, just use zlib.createUnzip() to handle both of the following cases:
      case 'gzip':
        pipeline(clientResponse, zlib.createGunzip(), output, onError);
        break;
      case 'deflate':
        pipeline(clientResponse, zlib.createInflate(), output, onError);
        break;
      default:
        pipeline(clientResponse, output, onError);
        break;
    }
  });
}
