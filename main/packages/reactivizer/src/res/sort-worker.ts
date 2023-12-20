import {createSorter} from './sorter';

const sorter = createSorter(null, {
  name: 'sorter',
  debug: false // process.env.NODE_ENV === 'development'
});

export {sorter};
