<div style="font-family: 'Figtree', sans-serif; font-weight: 300; letter-spacing: 0.02em;">

# Cypher Inspect

It is a pleasure to meet you.

You are drowning in code, I presume? Your artificial assistants—Claude, Cursor, Windsurf—write it faster than you can read it. Do not apologize. We all succumb to the tide eventually. 

The bottleneck has shifted. Writing is solved. Reading is the new friction. 

Cypher Inspect is a silent auditor. It analyzes your Git differences and calculates precisely what requires your attention. It discards the noise. It calculates the cognitive load. It tells you exactly how many minutes of your life you will spend reviewing a pull request.

Git tells you what changed. We tell you what matters.

## The Invocation

Run this inside any Git repository. It requires nothing from you.

```bash
npx @cypher/inspect
```

It will respond with a stark truth:

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

If you desire a deeper understanding of what transpired inside the shadows of each file, you may grant it a key. 

```bash
export OPENAI_API_KEY="..."
```

Then invoke it thusly:

```bash
npx @cypher/inspect --ai
```

We quietly support `GROQ_API_KEY`, `GEMINI_API_KEY`, and `OPENROUTER_API_KEY`. It will deduce your provider automatically. There is no need to configure it.

## The CI Gate

If you wish for it to stand guard over your pull requests automatically:

```bash
npx @cypher/inspect --init
```

It will place `.github/workflows/cypher-inspect.yml` into your repository. From that moment on, every pull request will be audited. If the confidence score drops below 80 percent, the build will fail. It does not ask for permission. 

## Philosophy

You do not need to read 127 files. 

You need to know if the authentication logic was altered. 
You need to know your confidence score.
You need to ship.

Be lazy. We have done the reading for you.

</div>
