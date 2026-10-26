# Alex's TCSS 490 Portfolio

A static portfolio for TCSS 490: Generative AI and Software Development. The site is the submission hub for all five course artifacts and will evolve throughout Autumn 2026.

## Assignment checklist

- [x] Public-ready static site
- [x] Five artifact cards
- [x] Artifact 1 completed with a reflection
- [x] Ideas in the Artifact 2–5 placeholders
- [x] AI collaboration log in [`BUILD_LOG.md`](BUILD_LOG.md)
- [x] Artifact 3 built: [`spending-sorter/`](spending-sorter/) (with its own [`LOG.md`](spending-sorter/LOG.md))
- [x] GitHub Pages deployment workflow

## Update the portfolio

All profile copy and artifact-card content live in [`site-data.js`](site-data.js). When an artifact is complete:

1. Change its `status` from `Idea` to `Complete`.
2. Replace the idea title, summary, tags, and reflection.
3. Add the live project or repository URL to `url`.
4. Commit and push; GitHub Pages redeploys automatically.

## Run locally

No dependencies or build step are required. You can open `index.html` directly or serve the folder with any static server.

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Verify

```bash
node tests/smoke.mjs
node --test spending-sorter/test/sorter.test.mjs
```

## Deployment

The workflow in `.github/workflows/deploy.yml` deploys the site to GitHub Pages whenever `main` is updated. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
