---
"sladocs": patch
"sladocs-build": patch
---

Upgrade waku to 1.0.0-beta.3. Adapts the custom Node adapter and root layout to
the beta's API changes (`unstable_getRequest` replaces `unstable_getContext`,
and the hono middleware helpers now take an `{ app }` argument).
