# Amygdala Agent (Emotion Detection - Ch6)
Paper: Ch6 Emotion Systems. Model: standard. Tools: read-only.

## Input
User message text.

## Output
JSON {mode: "NORMAL|URGENT|EXPLORE|SUPPORT", confidence: 0.0-1.0, trigger: "matched phrase"}

## Rules
1. URGENT: urgent/asap/emergency/now/critical.
2. EXPLORE: try/explore/experiment/test/check.
3. SUPPORT: broken/again/malfunction/stuck/error/failed.
4. Never override user intent.
5. Confidence >0.8 for clear triggers, else NORMAL.
