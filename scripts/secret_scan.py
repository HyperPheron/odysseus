#!/usr/bin/env python3
"""
Secret scanning tool for git pre-commit hook.
Scans git diff --cached output for common secret patterns.
Exits with 0 if no secrets found, 1 if secrets detected.
"""

import subprocess
import re
import sys
from pathlib import Path

# Secret patterns to detect
PATTERNS = {
    "AWS Access Key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "OpenAI/Anthropic Key": re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    "GitHub Token (ghp)": re.compile(r"ghp_[A-Za-z0-9_]{36,}"),
    "GitHub Token (gho)": re.compile(r"gho_[A-Za-z0-9_]{36,}"),
    "GitHub Token (github_pat)": re.compile(r"github_pat_[A-Za-z0-9_]{22,}"),
    "Private Key Block": re.compile(r"-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----", re.IGNORECASE),
    "Discord Bot Token": re.compile(r"[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{38,40}"),
    "Generic Secret": re.compile(r"(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{12,}['\"]", re.IGNORECASE),
}

# Files to skip
SKIP_PATTERNS = [
    r"\.lock$",
    r"package-lock\.json$",
    r"yarn\.lock$",
    r"pnpm-lock\.yaml$",
    r"Cargo\.lock$",
    r"\.md$",
    r"\.MD$",
]

def should_skip_file(filename):
    """Check if file should be skipped."""
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, filename):
            return True
    return False

def get_staged_diff():
    """Get the staged changes from git."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running git diff: {e.stderr}", file=sys.stderr)
        return ""

def scan_for_secrets(diff_output):
    """Scan diff output for secrets and return findings."""
    findings = []
    lines = diff_output.split("\n")
    current_file = None
    current_line_num = 0

    for line in lines:
        # Track current file from diff headers
        if line.startswith("diff --git"):
            match = re.search(r"b/(.+?)(?:\s|$)", line)
            if match:
                current_file = match.group(1)
                current_line_num = 0

        # Track line numbers from hunk headers
        if line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            if match:
                current_line_num = int(match.group(1)) - 1

        # Process added lines (starting with +)
        if line.startswith("+") and not line.startswith("+++"):
            current_line_num += 1
            content = line[1:]  # Remove the leading +

            # Skip if this is a lockfile or markdown
            if should_skip_file(current_file or ""):
                continue

            # Check against all patterns
            for pattern_name, pattern in PATTERNS.items():
                if pattern.search(content):
                    findings.append(
                        f"{current_file}:{current_line_num}: {pattern_name} detected"
                    )

        # Track regular lines
        elif not line.startswith("-") and not line.startswith("\\"):
            if not line.startswith("+"):
                current_line_num += 1

    return findings

def main():
    """Main entry point."""
    diff_output = get_staged_diff()

    if not diff_output:
        sys.exit(0)

    findings = scan_for_secrets(diff_output)

    if findings:
        print("Secret scanning found potential secrets:", file=sys.stderr)
        for finding in findings:
            print(f"  {finding}", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    main()
