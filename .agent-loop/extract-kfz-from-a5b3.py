#!/usr/bin/env python3
"""Extract Kfz pilot paths from git commit into workspace. Run when shell allows python3."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path("/home/runner/work/AgenturOS/AgenturOS")
COMMIT = "5e744164f42efc58b5b6deb85b8f73b646d11e97"
WORKTREE = Path("/tmp/kfz-a5b3-worktree")
PATHS = [
    "public/kfz",
    "src/app/api/inbound/kfz",
    "src/app/app/kfz-analytics",
    "src/app/dev/kfz-analytics",
    "src/app/dev/kfz-landing",
    "src/app/kfz",
    "src/app/impressum",
    "src/app/datenschutz",
    "src/features/inbound",
    "src/features/inbox",
    "src/lib/inbound",
    "src/lib/supabase",
    "src/types",
    "supabase/migrations/20260906120000_inbox_website_channel_source.sql",
    "supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql",
    "docs/kfz-inbound-local-test.md",
    "docs/kfz-pilot-release.md",
    ".env.example",
]


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=REPO, text=True, capture_output=True, check=check)


def main() -> int:
    os.chdir(REPO)
    fetch = run(["git", "fetch", "origin", "cursor/agenturos-controller-task-a5b3"], check=False)
    print(fetch.stdout)
    print(fetch.stderr)
    typ = run(["git", "cat-file", "-t", COMMIT]).stdout.strip()
    if typ != "commit":
        print(f"ERROR: {COMMIT} is {typ}", file=sys.stderr)
        return 1

    if WORKTREE.exists():
        shutil.rmtree(WORKTREE)
    run(["git", "worktree", "add", "--detach", str(WORKTREE), COMMIT])

    # Also collect *kfz* tests under src/features and tests/
    listed = run(
        ["git", "ls-tree", "-r", "--name-only", COMMIT, "--", *PATHS]
    ).stdout.splitlines()
    extra = run(["git", "ls-tree", "-r", "--name-only", COMMIT]).stdout.splitlines()
    for p in extra:
        if "kfz" in p.lower() and (
            p.startswith("src/features/") or p.startswith("tests/")
        ):
            if p not in listed:
                listed.append(p)

    copied: list[str] = []
    errors: list[str] = []
    for rel in listed:
        src = WORKTREE / rel
        dst = REPO / rel
        if not src.exists():
            errors.append(f"missing in worktree: {rel}")
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.is_dir():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
            for f in dst.rglob("*"):
                if f.is_file():
                    copied.append(str(f.relative_to(REPO)))
        else:
            shutil.copy2(src, dst)
            copied.append(rel)

    report = REPO / ".agent-loop" / "kfz-copy-report.txt"
    report.write_text(
        "COPIED:\n"
        + "\n".join(copied)
        + "\n\nERRORS:\n"
        + ("\n".join(errors) if errors else "(none)")
        + "\n"
    )
    print(f"Copied {len(copied)} files; errors={len(errors)}")
    print(f"Report: {report}")
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
