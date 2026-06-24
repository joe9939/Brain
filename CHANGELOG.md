# Changelog

## v1.0.1 (2026-06-24)
- Fix UTF-8 BOM for Windows Node.js compatibility
- Fix regex patterns: replace empty branches with proper English keywords
- Build MCP servers (memory-store, reward-system, world-model) with pre-compiled dist/
- Improve install.js with --status health check and auto config merge
- Remove all non-English characters from codebase
- Publish to GitHub (joe9939/brain-agent)

## v1.0.0 (2026-06-23)
- Initial release
- 20 brain-region sub-agents mapped to arXiv 2504.01990
- 3 MCP servers: memory-store, world-model, reward-system
- OpenCode plugin: L1 reflexive safety + injection guard
- /brain command with 6 subcommands
- 3-layer architecture: always-on → conditional → complex task
- Paper alignment: 42/43 (98%)
- brain.log event tracing
- Benchmarks framework: 10-task suite with metrics