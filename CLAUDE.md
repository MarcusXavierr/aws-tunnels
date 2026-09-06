Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads `.env`, so do not use dotenv.

## Git

- You may create local commits when a change is ready and relevant checks have passed. Do not ask for additional confirmation.

## Documentation

- Write all new or modified documentation in English. Do not translate unrelated existing documentation unless explicitly asked.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Do not use `express`.
- Use `bun:sqlite` for SQLite. Do not use `better-sqlite3`.
- Use `Bun.redis` for Redis. Do not use `ioredis`.
- Use `Bun.sql` for Postgres. Do not use `pg` or `postgres.js`.
- WebSocket is built-in. Do not use `ws`.
- Prefer `Bun.file` over `node:fs` `readFile` and `writeFile`.
- Use `Bun.$\`ls\`` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Do not use Vite. HTML imports fully support React, CSS, and Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import `.tsx`, `.jsx`, or `.js` files directly, and Bun's bundler will transpile and bundle them automatically. `<link>` tags can point to stylesheets, and Bun's CSS bundler will bundle them.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then run `index.ts`:

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Planning — GitHub Project

All work in this repository is tracked in the **AWS Tunnels** Project
(<https://github.com/users/MarcusXavierr/projects/5>), which is already linked to
`MarcusXavierr/aws-tunnels`.

### Hierarchy

GitHub has no epic concept. The hierarchy is represented by native sub-issues,
and labels define the item type:

```
issue label:epic        ← scope container; never receives code directly
└── issue label:task    ← deliverable unit (one PR)
    └── issue label:subtask  ← slice of a task
```

GitHub permits up to eight levels of depth and 100 sub-issues per parent.

Organization-only native `Epic` and `Task` issue types are unavailable here:
`repository.issueTypes` returns `null`. Labels are therefore the only source of
truth for type, and the Project exposes them through its built-in `Labels`
field. Do not create a `Type` Project field: it would create a second source of
truth, and `Type` is reserved by the API.

### Fields

`Parent issue` and `Sub-issues progress` are built-in fields that reflect the
sub-issue hierarchy automatically. Never fill them manually.

| Field | Values |
|---|---|
| `Status` | `Backlog`, `Todo`, `In Progress`, `Blocked`, `In Review`, `Done` |
| `Priority` | `P0` (blocks the plan), `P1` (critical path), `P2`, `P3` |

A newly added board item starts as `Todo` (the built-in GitHub workflow cannot
be changed by API). Move it to `Backlog` if it has not been prioritized yet.

### Task lifecycle

Before beginning planning or implementation for a planned GitHub task, set its
GitHub Project `Status` to `In Progress`. After implementation and relevant
checks finish, set that task's `Status` to `Done` before reporting completion.

### Views

| # | Name | Layout | Filter |
|---|---|---|---|
| 1 | All work | table | — |
| 2 | Epics | table | `label:epic` |
| 3 | Board | board | `-label:epic -status:Done` |
| 4 | Blocked | table | `status:Blocked` |

### How to operate

`gh project ...` does not work with the current token because it requires
`read:org` and `read:discussion`. Use `gh api graphql` (the token has `project`
and `repo`), or run `gh auth refresh -s read:org,read:discussion` to enable the
CLI.

Stable IDs, so they do not need to be rediscovered:

```
project      PVT_kwHOA5Jcfc4BilZX
repository   R_kgDOUPxAIw
field Status   PVTSSF_lAHOA5Jcfc4BilZXzhhc5uE
  Backlog d2a9cbad · Todo f75ad846 · In Progress 47fc9ee4
  Blocked 4e9262c6 · In Review eda788e3 · Done 98236657
field Priority PVTSSF_lAHOA5Jcfc4BilZXzhhc5wk
  P0 0baac52b · P1 0146a388 · P2 63775bbf · P3 052ac957
```

Create an epic and a child task, then add the task to the board:

```sh
gh issue create --title "Epic: tunnel supervisor" --label epic --body "..."
gh issue create --title "MySQL probe as keepalive" --label task --body "..."

# issue node IDs
gh api graphql -f query='query{repository(owner:"MarcusXavierr",name:"aws-tunnels"){
  parent:issue(number:1){id} child:issue(number:2){id}}}'

# attach the task to the epic
gh api graphql -f query='mutation{addSubIssue(input:{
  issueId:"<PARENT_ID>" subIssueId:"<CHILD_ID>"}){issue{number}}}'

# add the task to the board (retain the returned item ID)
gh api graphql -f query='mutation{addProjectV2ItemById(input:{
  projectId:"PVT_kwHOA5Jcfc4BilZX" contentId:"<CHILD_ID>"}){item{id}}}'

# set Priority to P1
gh api graphql -f query='mutation{updateProjectV2ItemFieldValue(input:{
  projectId:"PVT_kwHOA5Jcfc4BilZX" itemId:"<ITEM_ID>"
  fieldId:"PVTSSF_lAHOA5Jcfc4BilZXzhhc5wk"
  value:{singleSelectOptionId:"0146a388"}}){projectV2Item{id}}}'
```

Use `reprioritizeSubIssue` to reorder sub-issues and `removeSubIssue` to unlink one.
