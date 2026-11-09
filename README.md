<div align="center">

<img src="https://misereperdue.com/img/og-image.jpg" alt="Misère Perdue — eyes emblem" width="170" />

# MISÈRE PERDUE

**Independent creative platform · Store · Globe · Chat · Misery FM**

[Visit the website](https://misereperdue.com) · [Community](https://misereperdue.com/#globe) · [Shop](https://misereperdue.com/#shop)

</div>

---

## About

Misère Perdue is an independent creative brand and digital community. Its mobile-first experience brings together a curated storefront, **Misery Globe** discussion board, live community chat, and **Misery FM** synchronized audio sessions.

## Experience

| Feature | What it does |
| --- | --- |
| **Store** | Headless Shopify product discovery and checkout |
| **Misery Globe** | Community posts, discussions and replies |
| **Chat** | Account-based live conversation and community features |
| **Misery FM** | Owner-hosted audio sessions shared with listeners |
| **VIP** | Membership-oriented experiences and product features |
| **Web app** | Installable, responsive interface with light and dark modes |

## Technology

**Frontend:** HTML · CSS · JavaScript · Progressive Web App

**Hosting:** Cloudflare Pages

**Backend:** [Cloudflare Workers and Durable Objects](https://github.com/misereperdue/misery-worker)

**Commerce:** Shopify

The frontend is intentionally framework-free. Its readable sources live in `src/`, and minified, deployed assets live in `js/` and `css/`. Do not remove one as a duplicate of the other.

## Development

```bash
npm install
npm run check
npm run verify
npm run build
```

The Cloudflare Pages build is described in [the site guide](docs/SITE_GUIDE.md). Local tests, service worker cache versions, and mobile compatibility requirements should be checked before publishing changes. **Pushing to `main` may deploy the website.**

## Collaboration

Codex and Grok Bot may work on **any** task. Work is assigned per task, not permanently by feature or folder. Use isolated branches, documented progress, pull requests, and checks for overlapping work. See the pending [agent workflow proposal](https://github.com/misereperdue/misereperdue/pull/51) and the [development handoff](docs/CODEX_GRIM_HANDOFF.md).

## Project documentation

- [Site guide](docs/SITE_GUIDE.md) — architecture, visual design, build and release process
- [Third-party assets](docs/THIRD_PARTY.md) — licenses and attributions
- [Cleanup audit](https://github.com/misereperdue/misereperdue/pull/54) — ongoing repository review

## Brand and assets

Misère Perdue artwork, branding, photographs and original material remain the property of their respective rights holders. Third-party assets are credited in [THIRD_PARTY.md](docs/THIRD_PARTY.md). No blanket open-source license is implied by this public repository.

---

<div align="center"><sub>Designed for the small screen. Built for the community.</sub></div>
