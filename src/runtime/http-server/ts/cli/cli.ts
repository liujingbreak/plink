import {CliExtension} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program) => {
  program.command('gen-ssl-keys')
  .description('Use Openssl to generate a development purposed key pair for @wfh/http-server')
  .action(async (argument1: string[]) => {
    await (await import('./cli-gen-ssl-keys')).genSslKeys();
  });

};

export default cliExt;
