# Chaton

Real-time chat built for the frontend assignment: phone-number login, direct
and group conversations, live delivery, and a landing page for it.

## Stack

Next.js 16 (App Router, JavaScript) · Tailwind CSS v4 · TanStack Query for
server state · socket.io-client · Yup · lucide-react.

## Run it

```bash
npm install
npm run dev     # http://localhost:3101
```

No environment variables — the API base URL is a constant in
[`src/lib/api.js`](src/lib/api.js), since there is one fixed deployment.
`npm run build` and `npm run lint` both pass.

Routes: `/` landing, `/login`, `/chat` (redirects to `/login` without a token).

---

## Architecture

- **Next.js App Router.** The App Router is the recommended approach in current
  Next, and the landing page is public, so it ships prerendered HTML with real
  metadata rather than an empty SPA shell — which is what search engines need.
- **TanStack Query, no global store.** Almost all state is server state. Only
  the open conversation and active dialog are local. The token sits in
  `localStorage`, read via `useSyncExternalStore` so tabs stay in sync.
- **Three routes, not one screen with a mode flag.** My first pass switched
  views inside a single component — that left no second demo link and hid the
  landing page once a token existed.
- **Send over REST, not the socket.** The socket only acks `{ ok: true }`;
  `POST /messages` returns the stored message, so the optimistic bubble can be
  swapped by id.

The chat panel got the most care. Auto-scroll follows new messages only while
you are already at the bottom — scroll up and it holds your place and counts
what arrived. Loading older history restores the offset, so the line you were
reading does not jump. A failed send keeps its bubble with Retry and Discard
rather than losing your text. Reconnecting refetches, since nothing was
delivered while the socket was down.

Also: unread badges, Enter to send, a conversation filter, group admin tools,
Escape-to-close dialogs, and `prefers-reduced-motion` support.

## Design

Paper, deep green, mint and coral — editorial rather than another blue SaaS
dashboard. Space Grotesk over DM Sans, with a light grain.

The centrepiece is interactive: a chat panel with a **Naive auto-scroll** /
**How Chaton does it** toggle. Scroll up, press "Receive a message", and the
naive mode drags you to the bottom mid-sentence. It shows the decision above
instead of claiming it.

## AI usage

Claude for repetitive layout markup, for scripting the API probes behind
[API.md](API.md), and as a reviewer — it caught an auto-scroll effect that
force-scrolled on every message regardless of position.

Not from it: product direction, visual language, route structure, the scroll
rule. I replaced its single-component architecture, removed a "search messages"
button it left unimplemented, and rewrote effects where `useSyncExternalStore`
beat syncing state inside `useEffect`.

## API issues

All reproduced against the live deployment; details in [API.md](API.md).

| Issue                                                                   | Handled by                                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/users/search` matches `name` only, so searching by phone returns `[]` | Resolving phone queries client-side, with an honest empty state |
| The query goes raw into a regex — `q=(` and `q=+880…` both error        | Escaping metacharacters before sending                          |
| Search is case-sensitive: `Rafi` → 16 users, `rafi` → none              | Requesting plausible casings in parallel, merging by id         |
| Missing token answers `400`, invalid answers `401`                      | Classifying on `code` as well as status                         |
