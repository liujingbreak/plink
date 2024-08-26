import {inspect} from 'node:util';
import {Writable} from 'node:stream';
import {ReactorCompositeOpt} from './reactor-base';

export const conciseConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
  // eslint-disable-next-line no-console
  console.log(formatToConcise(...msgs));
};
export const conciseNocolorConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
  // eslint-disable-next-line no-console
  console.log(formatToConciseNoColor(...msgs));
};

export function formatToConcise(...messageItems: any[]) {
  return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, true)).join(' ');
}
export function formatToConciseNoColor(...messageItems: any[]) {
  return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, false)).join(' ');
}
export function createSimpleIndentLogger(colorful: boolean, timestamp: boolean, out: Writable) {
  let lastPrefix: string | undefined;
  return function(prefix: string, ...msgs: any[]) {
    if (lastPrefix === prefix) {
      out.write('  ');
    } else {
      out.write(prefix);
      out.write(' ');
      lastPrefix = prefix;
    }
    if (timestamp) {
      const date = new Date();
      out.write('[');
      out.write(date.getHours() + ':');
      out.write(date.getMinutes() + ':');
      out.write(date.getSeconds() + '.');
      out.write(date.getMilliseconds() + '] ');
    }
    const rawMsg = colorful ? formatToConcise(...msgs) : formatToConciseNoColor(...msgs);
    out.write(rawMsg.replaceAll(/\r?\n/g, '\n    '));
    out.write('\n');
  };
}
