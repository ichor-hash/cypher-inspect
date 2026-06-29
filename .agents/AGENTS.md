# Node CLI & GitHub Actions Development Rules

## 1. Cross-Platform Line Endings (Exit Code 127)
When developing a Node.js CLI tool on Windows that is published to NPM, the executable file defined in the `bin` field (e.g., `dist/index.js`) must strictly use `LF` line endings. If it contains Windows `CRLF` line endings, Linux environments (like GitHub Actions) will crash with a `127 not found` error because the OS attempts to execute `node\r`. 
**Rule**: Always include a `postbuild` script that strips `\r` (e.g., using `dos2unix`) or enforce `LF` via `.gitattributes` before publishing.

## 2. GitHub Actions `fetch-depth` for Git Diffing
By default, GitHub's `actions/checkout` performs a shallow clone (`fetch-depth: 1`), which only downloads the single merge commit. If a tool relies on historical diffing (e.g., `git diff HEAD^1`), it will silently fail or report 0 changes because the parent commit does not exist locally.
**Rule**: Any GitHub Action workflow running a Git history-dependent tool MUST set `fetch-depth: 0` in the checkout step.

## 3. GitHub Actions PR Comment Permissions
By default, the `GITHUB_TOKEN` in modern GitHub repositories is restricted to read-only access.
**Rule**: If a workflow intends to use the GitHub API to post comments on Pull Requests, it MUST explicitly define `permissions: pull-requests: write`.

## 4. Safely Stripping Terminal ANSI Codes
When exporting rich terminal output to Markdown (e.g., for PR comments), standard Regex (`/\x1b\[[0-9;]*[a-zA-Z]/g`) is insufficient because it misses OSC 8 terminal hyperlinks (e.g., `\x1b]8;;url\x1b\`).
**Rule**: Never use Regex to strip terminal formatting. Always use Node's built-in `stripVTControlCharacters` from the `node:util` module to guarantee 100% clean output.

## 5. Self-Referential `npx` execution in CI
When testing a CLI tool via `npx` inside its own source repository, `npx` will attempt to execute the local unbuilt `bin` file instead of downloading the published NPM package. If the `dist/` directory is in `.gitignore`, this crashes with `not found`.
**Rule**: In self-referential CI environments, never use `npx`. Instead, build the project locally (`npm ci && npm run build`) and execute the binary directly with `node`.
