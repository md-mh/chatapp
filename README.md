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
