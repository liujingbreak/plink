
### Modify package.json file

```json
"dr": {
  "cli": "dist/cli.js#default"
}
```
`cli.js` can be any file file, `#default` can be any other **export** member function name.

### Template `ts/cli.ts`

```ts
import {CliExtension, GlobalOptions, initConfigAsync} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('hellow [package...]')
  .description('Hellow command description')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    // TODO
  });
};

export default cliExt;
```
