import {Writable} from 'stream';
import {Response} from 'express';

export function createBufferResponse(originRes: Response,
  onFinish: (data: Buffer | string | any, send: () => void) => void): Response {

  const bufs: (Buffer | string | any)[] = [];
  const bufStream = new Writable({
    write(chunk, encoding, cb) {
      bufs.push(chunk);
      cb();
    },
    final(cb) {
      if (bufs.length > 0) {
        let data = Buffer.isBuffer(bufs[0]) ? Buffer.concat(bufs as Buffer[]) :
          typeof bufs[0] === 'string' ? (bufs as string[]).join('') : bufs;
        if (Array.isArray(data) && data.length === 1) {
          data = data[0];
        }
        onFinish(data, () => {
          origEnd(data);
        });
      }
    }
  });

  // const origWrite = originRes.write;
  const origEnd: Response['end'] = originRes.end.bind(originRes);
  const origOn = originRes.on;
  const origOnce = originRes.once;
  const origOff = originRes.off;

  originRes.write = function(...args: any[]) {
    return bufStream.write.apply(bufStream, args);
  };

  originRes.end = function(...args: any[]) {
    return bufStream.end.apply(bufStream, args);
  };

  originRes.on = function(evt: string, ...args: any[]) {
    if (evt === 'drain' || evt === 'finish') {
      return bufStream.on.call(bufStream, evt, ...args);
    } else {
      return origOn.call(bufStream, evt, ...args);
    }
  };
  originRes.once = function(evt: string, ...args: any[]) {
    if (evt === 'drain' || evt === 'finish') {
      return bufStream.once.call(bufStream, evt, ...args);
    } else {
      return origOnce.call(bufStream, evt, ...args);
    }
  };

  originRes.once = function(evt: string, ...args: any[]) {
    if (evt === 'drain' || evt === 'finish') {
      return bufStream.off.call(bufStream, evt, ...args);
    } else {
      return origOff.call(bufStream, evt, ...args);
    }
  };

  return originRes;
}
