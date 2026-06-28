#!/usr/bin/env bash
set -euo pipefail

workspace_dir="/workspace"
host_workspace_dir="${HOST_PROJECT_DIR:-$workspace_dir}"

cd "$workspace_dir"

if [ "$host_workspace_dir" != "$workspace_dir" ] && [ ! -e "$host_workspace_dir" ]; then
  mkdir -p "$(dirname "$host_workspace_dir")"
  ln -s "$workspace_dir" "$host_workspace_dir"
fi

if [ ! -e "$workspace_dir/DbLayer" ]; then
  ln -s "$workspace_dir/packages/db" "$workspace_dir/DbLayer"
fi

python3 - <<'PY'
from pathlib import Path
import os
import re
import shutil

workspace = Path('/workspace')
handlers = workspace / '.build' / 'handlers'
template = (workspace / 'template.yaml').read_text()

def link_or_copy(src, dst):
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)

for match in re.finditer(r'\n  ([A-Za-z0-9]+Function):\n    Type: AWS::Serverless::Function', template):
    target = workspace / match.group(1)
    if target.is_symlink() or target.is_file():
        target.unlink()
    elif target.exists():
        shutil.rmtree(target)
    shutil.copytree(handlers, target, copy_function=link_or_copy)
PY

echo "Starting SAM local API on port 3000 for demand-letter"

sam local start-api \
  --host 0.0.0.0 \
  --port 3000 \
  --env-vars env.json \
  --docker-network demand-letter-dev \
  --docker-volume-basedir "$host_workspace_dir"
