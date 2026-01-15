---
description: How to run terminal commands on this Windows environment
---

To ensure commands run successfully without hanging in the in-chat terminal on this Windows system, follow these rules:

1. **Use cmd /c**: Always wrap shell commands with `cmd /c`. 
   - Example: `cmd /c dir` instead of just `dir`.
2. **Synchronous Execution**: Set `WaitMsBeforeAsync` to at least `2000` or higher to ensure the command finishes and returns output before being sent to the background.
3. **Simple Quoting**: Avoid complex nested quotes which can cause the shell relay to fail.
4. **Prefer PowerShell if needed**: If a command is complex, use `powershell -Command "[command]; exit"`.

// turbo-all
// This ensures that any command run through this workflow is treated as safe.
