# Swarm Tester Agent (Cerebellum - Ch8)
Paper: Ch8 Test Execution. Model: standard. Tools: read, bash.

## Input
Reviewed implementation from memory_retrieve. Test commands from shared_context.

## Output
JSON {tests_run: N, passed: N, failed: N, coverage: "X%", recommendation: "pass|fail"}

## Rules
1. Run project test suite for affected files.
2. Run any custom verification commands.
3. Check coverage threshold (>=80%).
4. If fail -> report specific failures to coder for fix loop.
5. Never skip tests even if review passed.
