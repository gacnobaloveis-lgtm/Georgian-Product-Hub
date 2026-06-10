---
name: HomePage fixed background stacking
description: Why new top-level/global UI can render invisibly under HomePage's full-viewport background.
---

HomePage renders a `position: fixed`, full-viewport (100vw x 100vh) mountain background div at `z-0` (plus a gradient overlay), and wraps its real content in `relative z-10`.

**Rule:** Any global UI element mounted at the App root (e.g. before `<Router/>` in App.tsx) MUST be positioned with a stacking context and a high z-index (e.g. `sticky top-0 z-50` or `relative z-50`). A plain non-positioned block renders *behind* the fixed `z-0` background and is invisible, even though it is in the DOM and taking layout space.

**Why:** A positioned element (even `z-index:0`) paints above non-positioned static siblings in the same stacking context. The fixed background therefore covers any static top-level bar.

**How to apply:** When adding banners/announcement bars/overlays globally, verify visibility on the home page specifically, and give them `z-50`+. Symptom of the bug: API/query data loads fine, component returns JSX, but nothing shows at the top of `/`.
