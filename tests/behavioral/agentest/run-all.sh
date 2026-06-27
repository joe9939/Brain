#!/bin/bash
# Run all Agentest behavioral tests
# Prerequisites: OpenCode desktop running, brain agent installed

set -e

echo "=== Brain Agent — Behavioral E2E Test Suite ==="
echo ""

# Check if OpenCode is running
if ! curl -sf http://localhost:4096/session > /dev/null 2>&1; then
  echo "ERROR: OpenCode desktop not running on localhost:4096"
  echo "Start OpenCode and try again"
  exit 1
fi

echo "OpenCode desktop detected ✓"
echo ""

# Run L1 Perception tests
echo "--- L1 Perception ---"
npx agentest run --scenario "L1:" --config ../../../agentest.config.ts || true

# Run L1.5 Modulation tests
echo "--- L1.5 Modulation ---"
npx agentest run --scenario "L1.5:" --config ../../../agentest.config.ts || true

# Run L2 Gate tests
echo "--- L2 Gates ---"
npx agentest run --scenario "L2:" --config ../../../agentest.config.ts || true

# Run L3 Swarm tests
echo "--- L3 Execution ---"
npx agentest run --scenario "L3:" --config ../../../agentest.config.ts || true

# Run POST tests
echo "--- POST Recording ---"
npx agentest run --scenario "POST:" --config ../../../agentest.config.ts || true

# Run Circuit tests
echo "--- Circuits ---"
npx agentest run --scenario "CIRCUIT:" --config ../../../agentest.config.ts || true

# Run MCP tests
echo "--- MCP Integration ---"
npx agentest run --scenario "MCP:" --config ../../../agentest.config.ts || true

# Run Full Pipeline test
echo "--- Full Pipeline ---"
npx agentest run --scenario "FULL:" --config ../../../agentest.config.ts || true

# Run Edge Cases
echo "--- Edge Cases ---"
npx agentest run --scenario "EDGE:" --config ../../../agentest.config.ts || true

echo ""
echo "=== All behavioral tests completed ==="
