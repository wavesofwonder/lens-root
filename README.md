# Root on Lens

Root is a modular, self-managed identity layer for creators, contributors, and builders. It pulls profile and post data from various feeds on the Lens network to create a curated onchain portal and profile. Root is designed as a personal hub that unifies presence, publishing, and intent across Lens-native apps.

---

## 2. Why It Matters

Most profile tools today are offchain, centralized, or siloed. Root uses Lens protocol primitives (Profiles, Feeds, Graph, Actions) to create something composable, extensible, and user-owned. Root makes onchain identity expressive by combining data aggregation with intentional curation, enabling a more meaningful and sovereign representation across the network.

---

## 3. What Works Now

- Static single-page site using vanilla HTML/JS
- Config-driven identity loading via `config.json`
- ~~Connected to Lens API using a local Express proxy server to bypass CORS restrictions~~ Now connects via a Cloudflare Worker for CORS-safe GraphQL proxying
- Profile metadata and recent posts (from Hey.xyz and Fountain.ink) are fetched and rendered
- Covers multiple Lens post types (Text, Article, Reposts) with light media handling
- Clean, modular layout designed for future extension
- Deployable to Grove or Fleek

---

## 4. What Didn’t Work

- Initial static version was functional but lacked wallet connectivity.
- Attempted pivot to Next.js using ConnectKit for wallet integration:
  - [Next.js repo](https://github.com/wavesofwonder/root-next)
  - Connect/auth flow worked
  - Rewriting Lens SDK logic hit time constraints and remained incomplete before hackathon deadline

---

## 5. Future Scope

- Add authenticated views with follow/mirror/collect actions
- Publish interest or link list as a Lens-native feed using Grove
- Launch customisable profile starter for sovereign hosting 
- Support structured metadata for interests or intent (e.g. hiring, collaborating)
- Add content filtering and group surfacing via Lens Graph

---

## 6. Install & Run (current version)

```
bash
npm install
npm start
```

> Runs the local Express proxy (via `server.js`) and serves the static site.

## 7. License

MIT — build, fork, remix.