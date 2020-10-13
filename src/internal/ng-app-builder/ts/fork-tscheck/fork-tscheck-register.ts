// import '@wfh/plink/wfh/dist/node-path';

if (/[\\/]@ngtools[\\/]webpack[\\/].*?[\\/]type_checker_worker/.test(process.argv[1])) {
  // tslint:disable-next-line: no-console
  console.log('In forked @ngtools/webpack type checker');

  require('./fork-tscheck-init');
}

