# Changelog

## [2.0.0](https://github.com/okslab/ai-for-developers-project-386/compare/v1.0.0...v2.0.0) (2026-09-03)


### ⚠ BREAKING CHANGES

* **api:** Public API endpoints now use the /api prefix.

### Bug Fixes

* **api:** honor the contracted from query parameter ([#11](https://github.com/okslab/ai-for-developers-project-386/issues/11)) ([57707cd](https://github.com/okslab/ai-for-developers-project-386/commit/57707cd75c470717fff85226029bb00b35263212))
* **api:** isolate production API routes ([#8](https://github.com/okslab/ai-for-developers-project-386/issues/8)) ([fda566a](https://github.com/okslab/ai-for-developers-project-386/commit/fda566afdec615a1ef34f753267a61ec9e6a0349))
* **api:** validate aware datetimes and declare error responses ([#12](https://github.com/okslab/ai-for-developers-project-386/issues/12)) ([b5aa331](https://github.com/okslab/ai-for-developers-project-386/commit/b5aa331489fb680634afc1db465794aff77ae1b5))
* **bookings:** enforce the server-side slot grid ([#15](https://github.com/okslab/ai-for-developers-project-386/issues/15)) ([0756c6e](https://github.com/okslab/ai-for-developers-project-386/commit/0756c6e81a506667edf3c0b99d01ffe082b1caae))
* **slots:** round availability start up to the grid ([#13](https://github.com/okslab/ai-for-developers-project-386/issues/13)) ([d2e6f56](https://github.com/okslab/ai-for-developers-project-386/commit/d2e6f56555b8270bdc98bdd61542a4626c21da01))

## 1.0.0 (2026-08-21)


### Bug Fixes

* **backend:** import create payload models used in signatures ([4af367d](https://github.com/okslab/ai-for-developers-project-386/commit/4af367d33c47b3a5b0342e4d032b9cc12976a4a2))
* **e2e:** bind vite dev server to IPv4 for CI ([704c27b](https://github.com/okslab/ai-for-developers-project-386/commit/704c27bc7011cbf6fd4169645492c15d955281f7))
* **guest:** surface slot-conflict message on 409 ([a91a126](https://github.com/okslab/ai-for-developers-project-386/commit/a91a1267fdcbc8f78fc40cbdfeeed725f3bcb0d5))
