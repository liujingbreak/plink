// tslint:disable:no-console
import {DrPackageInjector} from './injector-factory';
import * as _ from 'lodash';

export default function(injector: DrPackageInjector) {
  const config = require('./lib/config');

  const chalk = require('chalk');
  injector.fromAllComponents()
  .factory('chalk', function() {
    return new chalk.constructor(
      {enabled: config.get('colorfulConsole') !== false && _.toLower(process.env.CHALK_ENABLED) !== 'false'});
  });
}
