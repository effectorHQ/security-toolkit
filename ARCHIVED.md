# Archived

This repository has been **archived**. Its functionality has been superseded by [`effector-audit`](https://github.com/effectorHQ/effector-audit).

## Why

`security-toolkit` provided basic security scanning. `effector-audit` now covers:

- Permission drift detection (declared vs actual behavior)
- Security rule scanning (prompt injection, data exfiltration, permission creep, obfuscation)
- Integration with the effector type system and `@effectorhq/core`

## Migration

Use `effector-audit` instead:

```bash
node effector-audit/bin/effector-audit.js scan <skill-directory>
node effector-audit/bin/effector-audit.js check-permissions <skill-directory>
```
