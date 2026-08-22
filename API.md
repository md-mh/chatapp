# Chaton Chat API

Written before the client, then corrected against the running deployment. The
published Swagger describes requests only — no response schemas, no status
codes — so everything below the "Endpoints" table was read off live traffic.

- REST base: `https://frontend-task-chatapp.onrender.com/api`
- Socket origin: `https://frontend-task-chatapp.onrender.com`
- Upstream Swagger: <https://frontend-task-chatapp.onrender.com/docs/>

## Authentication

`POST /auth/login` takes `{ phone, name }`. There is no separate registration:
a phone number the service has not seen becomes a new account on first login.
The response carries a JWT valid for seven days. Send it as
`Authorization: Bearer <token>` on every other REST call, and as
`auth: { token }` when opening the socket.

## Endpoints

| Method | Path                                          | Body or query              | Purpose                  |
| ------ | --------------------------------------------- | -------------------------- | ------------------------ |
| POST   | `/auth/login`                                 | `{ phone, name }`          | Login or register        |
| GET    | `/auth/me`                                    | Bearer token               | Restore current user     |
| GET    | `/users/search?q=`                            | Bearer token               | Find users               |
| GET    | `/conversations`                              | Bearer token               | List conversations       |
| POST   | `/conversations`                              | `{ userId }`               | Start a direct chat      |
| POST   | `/conversations/group`                        | `{ name, participantIds }` | Create a group           |
| GET    | `/conversations/{id}/messages?limit=&before=` | Bearer token               | Read history             |
| PATCH  | `/conversations/{id}`                         | `{ name }`                 | Rename a group           |
| POST   | `/conversations/{id}/participants`            | `{ userIds }`              | Add members, admin only  |
| DELETE | `/conversations/{id}/participants/{userId}`   | Bearer token               | Remove a member or leave |
| POST   | `/conversations/{id}/admins`                  | `{ userId }`               | Promote an admin         |
| POST   | `/messages`                                   | `{ conversationId, text }` | Send a message           |
| GET    | `/health`                                     | None — mounted on the root | Health check             |

## Response shapes

Envelopes are not consistent between endpoints, so each one is written out.

```jsonc
// POST /auth/login → 200
{ "token": "<jwt>", "user": { "_id": "…", "name": "…", "phone": "…", "createdAt": "…" } }

// GET /auth/me → 200, the user object with no wrapper
{ "_id": "…", "name": "…", "phone": "…", "createdAt": "…" }

// GET /users/search → 200, a bare array (see the caveats below)
[{ "_id": "…", "name": "…", "phone": "…" }]

// GET /conversations → 200, wrapped in `data`
{ "data": [
  { "_id": "…", "type": "direct", "updatedAt": "…",
    "lastMessage": { "text": "…", "sender": "<userId>", "createdAt": "…" },
    "participant": { "_id": "…", "name": "…", "phone": "…" } },
  { "_id": "…", "type": "group", "name": "…", "updatedAt": "…",
    "lastMessage": {},                       // empty object until a first message
    "createdBy": "…", "admins": ["<userId>"],
    "participants": [{ "_id": "…", "name": "…", "phone": "…" }] }
] }

// POST /conversations → 200, NOT the shape the list returns:
// no `type`, and `participants` holds raw ids rather than user objects.
{ "_id": "…", "participants": ["<userId>", "<userId>"], "createdAt": "…" }

// POST /conversations/group → 201, the full conversation with user objects
{ "_id": "…", "type": "group", "name": "…", "createdBy": "…",
  "admins": ["<userId>"], "participants": [{ "_id": "…", "name": "…", "phone": "…" }] }

// GET /conversations/{id}/messages → 200, newest first
{ "messages": [
    { "_id": "…", "conversation": "…", "sender": "<userId>", "text": "…", "createdAt": "…" }
  ],
  "hasMore": false }

// POST /messages → 200, the stored message
{ "_id": "…", "conversation": "…", "sender": "<userId>", "text": "…", "createdAt": "…" }

// Failures
{ "error": { "message": "No token provided", "code": "NO_TOKEN" } }
{ "error": { "message": "Validation failed", "code": "VALIDATION_ERROR",
             "details": [{ "path": "participantIds", "message": "a group needs at least 3 members" }] } }
```

## Behaviour worth knowing

Each of these was reproduced against the live deployment.

**Routing and status codes**

- `/health` is mounted on the deployment **root**. `GET /api/health` is `NOT_FOUND`.
- Creating a direct conversation answers **200**; creating a group answers **201**.
- A **missing** token answers `400 NO_TOKEN`; an **invalid** token answers
  `401 INVALID_TOKEN`. Classifying auth failures by status alone misses the first
  case, so the client checks the `code` too.
- Group management answers `403 FORBIDDEN` for non-admins
  ("Only admins can rename the group").
- A group with fewer than three members is rejected with `VALIDATION_ERROR`
  and a `details` array.

**Messages**

- The list is **newest first**. It has to be reversed for display.
- `before` must be a message `_id`. A timestamp answers `500 Cast to ObjectId failed`.
- `before` is **inclusive**: the cursor message is repeated at the head of the
  next page and must be deduplicated.
- `POST /messages` accepts `text: ""` and stores it. The empty-message rule is
  the client's to enforce.
- `POST /conversations` with your own id creates a self-thread. Also guarded
  client-side.
- `POST /conversations` is idempotent: the same pair returns the existing
  conversation on every subsequent call.

**`GET /users/search` — the interesting one**

The query is interpolated into a MongoDB regular expression, anchored to the
start of `name`, and matched case-sensitively. Three consequences:

| Query           | Result                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| `q=Rafi`        | 16 users                                                                                    |
| `q=rafi`        | 0 — casing matters                                                                          |
| `q=afi`         | 0 — the match is anchored, not a substring                                                  |
| `q=01998320044` | 0 — `phone` is never part of the match, only `name`                                         |
| `q=%2B8801711…` | `Regular expression is invalid: quantifier does not follow a repeatable item`, code `51091` |
| `q=(`           | `Regular expression is invalid: missing closing parenthesis`                                |
| `q=` (empty)    | the first 50 users; `limit` and `page` are both ignored                                     |

The `+` case matters most: it is the first character of most phone numbers, so
the natural thing to type produces a raw database error. How the client works
around all of this is in [`src/lib/search.js`](src/lib/search.js) — escape the
pattern, retry the plausible casings, and resolve phone numbers locally against
the directory page.

## Realtime

Socket.IO connects to the deployment root with `auth: { token }`. A rejected
token surfaces as `connect_error: "Invalid token"`.

| Direction | Event                  | Payload                                                       |
| --------- | ---------------------- | ------------------------------------------------------------- |
| emit      | `message:send`         | `{ conversationId, text }`, acknowledged with `{ ok: true }`  |
| receive   | `message:new`          | `{ id, conversation, sender, text, createdAt }`               |
| receive   | `conversation:updated` | the whole conversation, after rename / add / promote / remove |

Two details shape the client:

- **The server never echoes an event back to the client that caused it.** A
  sender never receives its own `message:new`, so the sending client has to
  place its own message locally.
- `message:new` uses `id` with an epoch `createdAt`, while REST uses `_id` with
  an ISO string. Both are normalised to one shape in `src/lib/messages.js`.

Sending goes over `POST /messages` rather than the socket, because the socket
only acknowledges with `{ ok: true }` while REST returns the stored message —
which is what lets the optimistic bubble be replaced by id. Delivery to
everyone else is identical either way.

## If I were designing this API

The brief invites renaming or reshaping endpoints. What I would change, and why:

1. **One envelope, everywhere.** `GET /conversations` wraps in `data`, `GET
/auth/me` does not, and `GET /users/search` returns a bare array. Pick one —
   `{ data, meta }` — so no client needs a shape-sniffing normaliser.
2. **`POST /conversations` should return what `GET /conversations` returns.**
   Today the create response omits `type` and inlines raw participant ids, so
   the client has to refetch the list to render the row it just created.
3. **Exclusive cursors.** `before` being inclusive makes every consumer
   deduplicate. `?before=<id>` should mean _strictly older than_.
4. **`401` for every auth failure.** A missing token answering `400` forces
   clients to special-case a string code to decide whether to sign someone out.
5. **Search that searches.** `GET /users?query=` matching a case-insensitive
   substring of **both** `name` and `phone`, with the input escaped before it
   reaches the regex engine, plus `limit`/`cursor` that are actually honoured.
6. **Reject empty messages server-side.** `text` should be `minLength: 1` after
   trimming, rather than trusting each client to refuse.
7. **Consistent creation codes.** `201` for both direct and group creation, or
   `200` for both — not one of each.
