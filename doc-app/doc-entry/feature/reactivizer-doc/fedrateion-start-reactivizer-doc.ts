// import('./start-reactivizer-doc');
import loadRemote from '@wfh/doc-ui-common/client/dynamic-module-federation';

loadRemote('http://localhost:14334/shell/shellRemoteEntry.js', '_wfh_docEntry_shell', 'react')
.then(m => console.log(m));
