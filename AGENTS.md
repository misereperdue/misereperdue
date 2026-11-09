# Codex + Grok Bot collaboration rules

Either agent may take **any** task, randomly assigned by the user. No feature, folder, or subsystem belongs permanently to one agent.

1. Before coding, check open issues/PRs here and in the sibling repo for active work and conflicting files/contracts. Read DEVELOPMENT_HANDOFF.md.
2. Claim the *task*, not the part of the website. Create or reference a GitHub issue; note agent, expected files, branch, status and dependencies in its description or PR.
3. Create a unique task branch from latest main: codex/<issue>-<task> or grok/<issue>-<task>. Do not push directly to main; do not share branches between agents.
4. Parallel work is welcome only when changes do not conflict, including shared APIs, database migrations, configs and Cloudflare resources. Coordinate overlapping tasks before coding.
5. Make scoped commits, run relevant tests, and open a PR to main. Include a clear summary, affected files, tests, deployment impact and rollback notes.
6. Keep detailed status and exact next steps in the issue/PR. If credits run out, record the last working commit, blockers and what remains.
7. Changes involving the other repo require linked PRs and compatibility checks.
8. No production deployments, merges, credential revocation, destructive cloud operations or migrations without user's explicit approval. Use previews when possible, keeping data/resources isolated.
9. Refresh your task branch against main and resolve conflicts before merging.
10. Shared handoff file tracks durable policy and milestones; GitHub issues and PRs are the live task board. Avoid concurrent edits to that same handoff file.

Sibling repositories:
- Website: misereperdue/misereperdue
- Cloudflare Worker: misereperdue/misery-worker
