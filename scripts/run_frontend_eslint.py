#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"


def main() -> int:
    raw_paths = sys.argv[1:]
    frontend_paths = []

    for raw_path in raw_paths:
        path = Path(raw_path)
        if path.parts and path.parts[0] == "frontend":
            frontend_paths.append(str(Path(*path.parts[1:])))

    if not frontend_paths:
        return 0

    command = [
        "pnpm",
        "exec",
        "eslint",
        "--max-warnings",
        "0",
        "--report-unused-disable-directives",
        "--no-error-on-unmatched-pattern",
        *frontend_paths,
    ]

    completed = subprocess.run(command, cwd=FRONTEND_DIR, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
