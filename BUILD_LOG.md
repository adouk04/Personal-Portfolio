# Build log

This file records how I worked with AI chat tools on the portfolio. It is intentionally concise; the goal is to preserve the decisions and changes, not every generated token.

## Tools used

- **ChatGPT**: used first to build the initial version of the portfolio.
- **Claude**: I switched to Claude partway through to make the design changes and polish the site.

## Prompts I used

**Prompt 1**

> https://cfb3.github.io/TCSS490-26-AUTUMN/weeks/week-1/
> https://cfb3.github.io/TCSS490-26-AUTUMN/assignments/artifact-1/#details
> https://github.com/adouk04/Personal-Portfolio
> check this website and build the entire thing necessary. let me know what you need me to do, i also created a repo you can add to

**Prompt 2**

> choose a different color wave. i like the layout of the site but use a  more appealing colorwave

## Session 1 — October 11, 2026

### What I asked for

- Read the TCSS 490 Week 1 page and the full Artifact 1 specification.
- Inspect the empty `Personal-Portfolio` repository.
- Build everything required for Artifact 1 and identify any steps I still need to do myself.

### What the AI found

- The assignment requires a public, front-end-only portfolio.
- It needs one card for each of the five course artifacts.
- Artifact 1 must describe this site and include a short reflection.
- Artifacts 2–5 should hold personal ideas for now.
- The repository must contain a log of the AI collaboration.
- The same live link will be reused throughout the quarter.

### What changed

- Created a responsive single-page portfolio with a custom visual system, light/dark themes, keyboard-visible focus states, and reduced-motion support.
- Added five artifact cards. Artifact 1 is complete; Artifacts 2–5 contain initial ideas connected to my interests in mobile products, AI, civic tech, and fintech.
- Centralized all editable profile and artifact content in `site-data.js` so future updates do not require layout changes.
- Added repository documentation, a smoke test, and a GitHub Pages deployment workflow.
- Updated the deployment workflow to enable GitHub Pages automatically on its first successful run.

### Decisions and revisions

- Chose plain HTML, CSS, and JavaScript so the site stays easy to understand, edit, and deploy without a build step.
- Treated the portfolio as a living field notebook rather than a generic resume page, since the assignment is about documenting the quarter's builds and reflections.
- Used publicly associated project themes only as a starting point. Personal copy and placeholder ideas remain easy to revise.

### What I verified

- The page contains exactly five artifact entries.
- Artifact 1 is marked complete and has a reflection.
- Artifacts 2–5 are clearly marked as ideas.
- Required files and deployment metadata are present.
- The page works at both desktop and mobile widths and remains usable without animation.
