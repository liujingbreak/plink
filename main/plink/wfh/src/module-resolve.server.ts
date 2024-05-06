/* eslint-disable no-console */
import {DrPackageInjector} from './injector-factory';
import * as _ from 'lodash';
import config from './config';

export default function(injector: DrPackageInjector) {

  const chalk = require('chalk');
  injector.fromAllComponents()
  .factory('chalk', function() {
    return new chalk.constructor(
      {enabled: config.get('colorfulConsole') !== false && _.toLower(process.env.CHALK_ENABLED) !== 'false'});
  });
}
