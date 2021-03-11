import express = require('express');
import * as rx from 'rxjs';
declare const _default: {
    activate(): void;
    expressAppReady$: rx.ReplaySubject<express.Application>;
    app: express.Express;
};
export = _default;
