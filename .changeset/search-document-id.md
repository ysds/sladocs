---
"sladocs": patch
---

Fix the search index using the absolute filesystem path as the document ID, which leaked build-machine paths. It now uses the page URL instead.
