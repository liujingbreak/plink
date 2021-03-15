import express = require('express');
import * as rx from 'rxjs';
import { ExtensionContext } from '@wfh/plink';
declare const _default: {
    activate(api: ExtensionContext): void;
    expressAppReady$: rx.ReplaySubject<express.Application>;
    app: express.Express;
};
export = _default;
