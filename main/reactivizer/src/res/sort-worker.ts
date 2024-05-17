import {conciseConsoleLogger} from '../nodejs-utils';
import {createSorter} from './sorter';

const sorter = createSorter(null, {
  name: 'sorter',
  debug: process.env.NODE_ENV === 'development',
  log: conciseConsoleLogger
});

export {sorter};
