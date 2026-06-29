# Cypher Inspect

Review AI-generated code in seconds.

Cypher Inspect is a CLI that analyzes Git changes and tells you what actually matters.

Instead of scrolling through hundreds of lines of diff, it summarizes architectural changes, highlights potential risks, and points you to the files worth reviewing.

Built for developers using Claude Code, Cursor, Windsurf, Codex, Gemini CLI and other AI coding tools.

## Quick Start

Run it inside any Git repository.

```bash
npx @cypher/inspect
```

## AI Explanations

Want a deeper explanation of what changed inside each file? 

Export your preferred provider once.

```bash
export OPENAI_API_KEY="..."
```

Then run:

```bash
npx @cypher/inspect --ai
```

Also supports:
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

Cypher Inspect automatically detects your provider.

## GitHub Pull Request Reviews

Generate a GitHub Actions workflow.

```bash
npx @cypher/inspect --init
```

This creates:
`.github/workflows/cypher-inspect.yml`

Every pull request automatically receives a review summary generated from the repository diff.

No additional setup required.

## Philosophy

Git tells you what changed.

Cypher Inspect tells you what matters.
