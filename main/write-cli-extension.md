
### Modify package.json file

```json
"dr": {
  "cli": "dist/cli.js#default"
}
```
`cli.js` can be any file file, `#default` can be any other **export** member function name.

### Template `ts/cli.ts`

```ts
import {CliExtension, GlobalOptions} from 'dr-comp-package/wfh/dist';
import {initConfigAsync} from 'dr-comp-package/wfh/dist/utils/bootstrap-server';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('hellow [package...]', 'Hellow command description')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    // TODO
  });
}

export default cliExt;
```
