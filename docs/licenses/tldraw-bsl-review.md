# License Review: tldraw — BSL 1.1

**Package:** `tldraw`
**Version:** 4.5.4
**License:** Business Source License 1.1 (BSL-1.1)
**Review date:** 2026-03-31
**Reviewer:** Engineering team

---

## License terms summary

The tldraw SDK is distributed under the **Business Source License 1.1**.
Key terms (as of tldraw v4):

| Term | Value |
| --- | --- |
| Licensed work | tldraw SDK (npm: `tldraw`) |
| Additional use grant | You may use the Licensed Work in production, provided your product is **not** a Whiteboard or Diagramming tool that competes with tldraw. |
| Change date | 4 years after each release date |
| Change license | Apache 2.0 |
| Licensor | tldraw Inc. |

**After the change date**, each version automatically converts to Apache 2.0.

---

## Use-case analysis for SocialClaw

| Criterion | Assessment |
| --- | --- |
| Product category | Social-media content creation / publishing platform |
| Canvas purpose | Render AI-generated HTML content (posts, stories, carousels) on a composable surface |
| Competes with tldraw? | **No.** SocialClaw is not a whiteboard, diagramming, or collaborative drawing tool. The canvas is an internal rendering surface, not the product itself. |
| Self-hosted model | Open-source, self-hostable (n8n-style). Users run SocialClaw locally or on their own infrastructure. |
| SaaS model | Paid cloud subscription for hosted version. |
| Redistribution of tldraw source? | **No.** tldraw is consumed as an npm dependency. No source redistribution. |

### Conclusion

SocialClaw's use of tldraw falls **within the additional use grant** of BSL 1.1.
The product is a content-creation platform, not a whiteboard or diagramming tool.
Both the self-hosted and SaaS deployment models are compliant.

---

## Risk mitigations

1. **ESLint guard** — `no-restricted-imports` rule prevents accidental introduction of competing canvas libraries alongside tldraw.
2. **CI gate** — A CI check verifies this review document exists when `tldraw` is declared in `package.json`. Removal of this document blocks merge to `main`.
3. **Version pinning** — The tldraw dependency is pinned to `^4.x` to avoid unintentional major version upgrades that may change license terms.
4. **Periodic review** — This document should be re-reviewed when upgrading to a new tldraw major version.

---

## Sign-off

- [ ] Engineering lead has reviewed and acknowledges BSL-1.1 terms
- [ ] Product confirms SocialClaw does not compete with tldraw's whiteboard/diagramming market
- [ ] Legal review completed (if applicable)

**Approved by:** ___________________________
**Date:** ___________________________
