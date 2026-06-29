<div style="font-family: 'Figtree', sans-serif; font-weight: 300; letter-spacing: 0.02em;">

# Cypher Inspect

The bottleneck in software engineering has shifted. Artificial assistants generate code faster than humans can read it. The friction is no longer in writing; it is in reading.

Cypher Inspect is an independent, deterministic auditor designed to resolve this imbalance. It analyzes Git differentials, discards the noise, and calculates precisely what requires human attention. It calculates the cognitive load. It outputs exactly how many minutes must be spent reviewing a pull request.

Git reveals what changed. Cypher Inspect reveals what matters.

## The Invocation

Execution requires zero configuration. Run this command inside any Git repository.

```bash
npx @cypher/inspect
```

The auditor responds with a stark, deterministic truth:

```text
Repository Summary
127 files changed
━━━━━━━━━━━━━━━━━━━━
Review Time
4 minutes
━━━━━━━━━━━━━━━━━━━━
Files Worth Reading
7
━━━━━━━━━━━━━━━━━━━━
Authentication
Modified
Database
Unchanged
Configuration
Modified
━━━━━━━━━━━━━━━━━━━━
Confidence
93%
```

## AI Explanations

For a deeper inspection into the modifications within each file, an API key may be provided. The auditor will utilize the designated language model to generate concise, line-level explanations.

```bash
export OPENAI_API_KEY="..."
```

Following the export, invoke the auditor:

```bash
npx @cypher/inspect --ai
```

The system quietly supports `GROQ_API_KEY`, `GEMINI_API_KEY`, and `OPENROUTER_API_KEY`. It deduces the provider automatically. No further configuration is necessary.

## The CI Gate

The auditor is capable of standing guard over pull requests automatically. 

```bash
npx @cypher/inspect --init
```

Executing this command places a `.github/workflows/cypher-inspect.yml` file into the repository. From that moment forward, every pull request is audited. If the confidence score drops below 80 percent, the continuous integration build will fail. It acts autonomously.

## Philosophy

It is unnecessary to read 127 files. 

It is necessary to know if the authentication logic was altered. 
It is necessary to know the confidence score.
It is necessary to ship code.

The reading has been done. The analysis is complete.

</div>
