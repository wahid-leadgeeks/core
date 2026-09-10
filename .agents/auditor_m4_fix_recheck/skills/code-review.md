# Code Review Checklist
Source: /home/noah/.gemini/config/skills/code-review/SKILL.md

Key audit checks:
1. Determine review scope: git status, git diff
2. Deep review: trace changed flows end-to-end, check for regressions in consumers/callers
3. Validation: linter, typecheck, tests, build
4. Integrity checks: zero facades, zero bypasses, authentic database logic, zero leaks
