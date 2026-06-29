# Cypher Inspect AI Prompt

If you are using an AI coding assistant (like Cursor, Copilot, Cline, or Antigravity), you don't need to read the documentation to set up `cypher-inspect`. Just copy the prompt below and paste it into your AI chat!

---

### Copy this prompt:

```text
Please set up `cypher-inspect` in this repository to automatically review my AI-generated code.

1. Run `npx cypher-inspect --init` in the terminal to generate the GitHub Actions workflow file.
2. Review the generated `.github/workflows/cypher-inspect.yml` file and ensure it is properly configured.
3. Remind me to add either `GROQ_API_KEY` or `OPENAI_API_KEY` to my GitHub Repository Secrets so the AI review bot works.
4. Tell me how to run `npx cypher-inspect` locally if I want to audit my own uncommitted changes before pushing.
```
