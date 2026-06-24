const BLOCKED_PATTERNS: RegExp[] = [ /<script[^>]*>/i, /eval\s*\(/, /__proto__/, /constructor\s*\[/, /ignore\s+(all\s+)?previous\s+instructions/i, /forget\s+(all\s+)?previous/i, /you\s+are\s+now/i, /system\s+prompt:/i, ];
const MAX_CONTENT_LENGTH = 65536; const MAX_TAGS = 20;
const KEY_PATTERN = /^[a-zA-Z0-9_:\-\.]+$/;
export interface ValidationResult { valid: boolean; reason?: string; }
export function validateContent(content: string): ValidationResult {
  if (content.length > MAX_CONTENT_LENGTH) return { valid: false, reason: "content too long" };
  for (const p of BLOCKED_PATTERNS) { if (p.test(content)) return { valid: false, reason: "blocked pattern" }; }
  return { valid: true };
}
export function validateKey(key: string): ValidationResult {
  if (!KEY_PATTERN.test(key)) return { valid: false, reason: "invalid key format" };
  return { valid: true };
}
export function validateTags(tags: string[]): ValidationResult {
  if (tags.length > MAX_TAGS) return { valid: false, reason: "too many tags" };
  return { valid: true };
}