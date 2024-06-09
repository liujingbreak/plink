import {inspect} from 'node:util';
import {ReactorCompositeOpt} from './reactor-base';

export const conciseConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
  // eslint-disable-next-line no-console
  console.log(formatToConcise(...msgs));
};

export function formatToConcise(...messageItems: any[]) {
  return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, true)).join();
}
export function formatToConciseNoColor(...messageItems: any[]) {
  return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, false)).join();
}
