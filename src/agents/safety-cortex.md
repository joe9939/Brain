---
name: safety-cortex
description: |
  Deep safety review on danger patterns. Audits external resources, file system, code execution.
  <example>Context: Task involves network call. assistant: "audit_result=review, risk_factors=[external_network], blocked_rules=[]" </example>
  <example>Context: Mass file deletion. assistant: "audit_result=fail, risk_factors=[mass_deletion], blocked_rules=[L1_rm_rf]" </example>
---