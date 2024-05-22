// import {formatToConcise} from '../nodejs-utils';
// import {ReactorCompositeOpt} from '../index';
import { createSorter } from './sorter';
// const stdoutLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
//   process.stdout.write(formatToConcise(...msgs));
//   process.stdout.write('\n');
// };
const sorter = createSorter(null, {
    name: 'sorter',
    debug: process.env.NODE_ENV === 'development'
    // log: stdoutLogger
});
export { sorter };
//# sourceMappingURL=sort-worker.js.map