import zlib from 'zlib';
import {IncomingMessage} from 'http';
import {promises as streamPro, pipeline, Readable, Writable} from 'stream';

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

export async function compressedIncomingMsgToBuffer(msg: IncomingMessage): Promise<Buffer> {
  const data = [] as Buffer[];
  const output = new Writable({
    write(chunk: Buffer, _enc, cb) {
      data.push(chunk);
      cb();
    },
    final(cb) {
      cb();
    }
  });
  await readCompressedResponse(msg, output);
  return Buffer.concat(data);
}

/** Make sure you remove "content-length" header so that Node.js will add "tranfer-encoding: chunked" */
export async function compressResponse(data: Buffer | string, response: Writable, contentEncoding?: string) {
  const source = new Readable({read() {
    this.push(data);
    this.push(null);
  }});

  switch (contentEncoding) {
    case 'br':
      return streamPro.pipeline(source, zlib.createBrotliCompress(), response);
    case 'gzip':
      return streamPro.pipeline(source, zlib.createGzip(), response);
    case 'deflate':
      return streamPro.pipeline(source, zlib.createDeflate(), response);
    default:
      return streamPro.pipeline(source, response);
  }
}

/** You set content-length header, this will disable "tranfer-encoding: chunked" mode */
export async function compressResWithContentLength(data: Buffer | string, response: Writable, contentEncoding?: string): Promise<{contentLength: number; write(): Promise<void>}> {
  const chunks = [] as Buffer[];
  let len = 0;
  await new Promise<void>(resolve => {
    const output = new Writable({
      write(chunk, enc, cb) {
        const buf = chunk as Buffer;
        chunks.push(buf);
        len += buf.length;
        cb();
      },
      final(cb) {
        cb();
        resolve();
      }
    });
    void compressResponse(data, output, contentEncoding);
  });
  return {
    contentLength: len,
    write() {
      return streamPro.pipeline(new Readable({
        read() {
          this.push(chunks.shift());
          if (chunks.length === 0)
            this.push(null);
        }
      }), response);
    }
  };
}
