# Packages in this directory are different from those packages in [src](../../src)

- They are directly referenced by @wfh/plink which is source code under `/main/wfh/ts`, and being packed together with @wfh/plink, not as isolated Node packages.

  For this purpose, check [../tsconfig.json](../tsconfig.json) and [../tsconfig-plink.json](../tsconfig-plink.json), they are "paths" mapped to **relative** in TS source code.

- They are not compiled by command `plink tsc`, they are compiled together with @wfh/plink package iteself.

- They can also be packed individually as library like the other "Plink" package, thats why they have their own package.json file.

## Import reference

In source code under [main/wfh/ts](main/wfh/ts), to import a file from these packages, always reference compiled file (.ts.d) `.../dist/..` like below,

```js
import {isActionOfCreator, castByActionType
  } from '../../redux-toolkit-observable/dist/helper';
```

So when @wfh/plink gets compiled out, the actual JS file source code will be like 
```js
require('../../redux-toolkit-observable/dist/helper')
```
