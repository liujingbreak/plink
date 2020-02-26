set -e
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
drcp="node node_modules/dr-comp-package/bin/drcp.js"

$drcp run "${dir}/prebuild-post.ts#main" $*
