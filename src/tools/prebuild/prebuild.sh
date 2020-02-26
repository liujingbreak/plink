set -e
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

bash "${dir}/prebuild-fast.sh" $*
# remote deploy
bash "${dir}/prebuild-post.sh" $*

