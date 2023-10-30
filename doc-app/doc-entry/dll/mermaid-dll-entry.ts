// This file is in fact no much useful, the consumer program can directory "import" "mermaid" instead of this file.
// But @wfh/cra-script requires the first entry file must be a file that is inside a Plink package,
// so that it can execute any configuration script which comes along with it.
import mermaid from 'mermaid';
export {mermaid as default};
