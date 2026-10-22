# Full Stack Skill Roadmap

A sequenced, topic-by-topic learning path for full-stack JavaScript and TypeScript development: **89 topics in 10 sections**, from semantic HTML to rate limiting. Every topic has a notes file and a code example next to it, and the topics are meant to be done in the order they appear.

The notes are written to be checked, not only read. Where a section's code was compiled, built or run, its README says how, the later notes report what was actually observed, and anything that was not run is labelled as such. The last two sections go furthest: they were tested against a real browser, a real SQLite database and a real Redis server.

**Start here:** [1. HTML / CSS](./01-html-css/README.md)

## Sections

| #  | Section                                                               | Topics | Roadmap numbers | Focus                                            |
| -- | --------------------------------------------------------------------- | ------ | --------------- | ------------------------------------------------ |
| 1  | [HTML / CSS](./01-html-css/README.md)                                 | 8      | 1 to 8          | Semantic HTML, layout and styling                |
| 2  | [Git & GitHub](./02-git-github/README.md)                             | 4      | 9 to 12         | Version control and collaboration                |
| 3  | [JavaScript](./03-javascript/README.md)                               | 26     | 13 to 38        | The language, the runtime and the browser basics |
| 4  | [TypeScript](./04-typescript/README.md)                               | 4      | 39 to 42        | Static types on top of JavaScript                |
| 5  | [React](./05-react/README.md)                                         | 16     | 43 to 58        | Components, hooks and Redux Toolkit              |
| 6  | [Testing (Basic)](./06-testing/README.md)                             | 2      | 59 to 60        | Jest and React Testing Library                   |
| 7  | [Next.js](./07-nextjs/README.md)                                      | 10     | 61 to 70        | The App Router and production concerns           |
| 8  | [Node.js / Express](./08-nodejs-express/README.md)                    | 12     | 71 to 82        | An Express 5 API with a database, JWT and CORS   |
| 9  | [Web Security Basics](./09-web-security-basics/README.md)             | 4      | 83 to 86        | Input validation, hashing, XSS and CSRF          |
| 10 | [API / System Design Basics](./10-api-system-design-basics/README.md) | 3      | 87 to 89        | Pagination, caching and rate limiting            |

## How to use this repo

1. **Go in order.** Later sections lean on earlier ones: React, Next.js and Node.js assume the JavaScript section is solid, and the security and API sections build on Node.js / Express.
2. **Read the section README first.** It gives the topic table, explains how the topics fit together, and ends with a suggested capstone exercise that uses the whole section at once.
3. **For each topic:** read the notes, open the code example, run it, then change it. The `Code Example` section at the bottom of every notes file links the code (the larger projects also say how to run it), and the `Practice` section gives exercises that build on it.
4. **Finish each section with its capstone** before moving on, so the topics are used together and not only one at a time.

## What you need

Each section README and each topic's `Code Example` section says what that code needs. For the later sections:

- **Node.js and npm.** The Web Security and API labs were run on Node 22.22.0. Other versions were not tested.
- **A Chromium.** The browser labs (XSS, CSRF and the HTTP-cache lab) drive a real browser. Set `CHROMIUM_PATH` to a Chrome or Chromium you already have, or install one with `npx playwright-core install chromium` (the notes say that install command was not run).
- **A `redis-server`.** The shared-cache and rate-limiting demos in the API section start and stop their own copy on a free local port, or use a server you give them through `REDIS_URL`.

## Repository layout

```text
full-stack-skill-roadmap/
├── README.md                    <- this page
├── 01-html-css/
│   ├── README.md                <- section overview, topic table, capstone exercise
│   ├── 01-semantic-html.md      <- notes for the first topic of the section
│   ├── 01-semantic-html.html    <- its code example
│   └── ...
├── 02-git-github/
├── 03-javascript/
├── 04-typescript/
├── 05-react/
├── 06-testing/
├── 07-nextjs/
├── 08-nodejs-express/
├── 09-web-security-basics/
└── 10-api-system-design-basics/
```

- **Section folders** are numbered `01` to `10` in learning order, so GitHub lists them in the right order.
- **Topic files restart at `01` inside every section.** The number in a file name is the topic's position in its section, and the line under the title in each notes file gives its position in the whole roadmap, for example `**Topic 85 of 89** (Section: Web Security Basics, 3 of 4)`.
- **Long topic names get a short file name.** For example, the topic "Event Loop, Call Stack, Microtask/Macrotask Queue" lives in `03-javascript/16-event-loop.md`.
- **Small examples are a single file** next to the notes (`.html`, `.js`, `.ts`, `.tsx`, `.sh` or a `.test.ts` file). **Larger ones are a folder** with the same name as the notes file.

## How each notes file is laid out

- **`# Title` and the topic line.** The topic name and its position, for example `Topic 87 of 89`.
- **`## Notes`.** The explanation. In the later topics (roughly from the middle of the Next.js section on) it starts with a project structure tree and uses "Verified directly" callouts for results that were observed by running the code.
- **`## Resources`.** Links to documentation, specifications and articles.
- **`## Practice`.** Exercises that build on the code example (titled `## Practice / Exercises` in the earlier topics).
- **`## Code Example`.** Links to the code and the commands to run it.

## All 89 topics

The number is the topic's position in the whole roadmap, 1 to 89. Each section below has a short description, a link to its README, and its topics.

### 1. HTML / CSS

Meaningful page structure with semantic HTML, then layout and styling: the box model, specificity and the cascade, Flexbox, Grid, positioning, responsive design with media queries, and CSS variables. Examples are self-contained `.html` pages.

Section README: [01-html-css](./01-html-css/README.md)

| # | Topic                                        | Notes                                                        |
| - | -------------------------------------------- | ------------------------------------------------------------ |
| 1 | Semantic HTML                                | [Notes](./01-html-css/01-semantic-html.md)                   |
| 2 | Box Model                                    | [Notes](./01-html-css/02-box-model.md)                       |
| 3 | Specificity & Cascade                        | [Notes](./01-html-css/03-specificity-cascade.md)             |
| 4 | Flexbox                                      | [Notes](./01-html-css/04-flexbox.md)                         |
| 5 | Grid                                         | [Notes](./01-html-css/05-grid.md)                            |
| 6 | Position (relative, absolute, fixed, sticky) | [Notes](./01-html-css/06-position.md)                        |
| 7 | Responsive Design & Media Queries            | [Notes](./01-html-css/07-responsive-design-media-queries.md) |
| 8 | CSS Variables                                | [Notes](./01-html-css/08-css-variables.md)                   |

### 2. Git & GitHub

Version control: init, add, commit, push and pull, branching, resolving merge conflicts, and pull requests with code review. Examples are shell scripts and command-line walkthroughs.

Section README: [02-git-github](./02-git-github/README.md)

| #  | Topic                                      | Notes                                                            |
| -- | ------------------------------------------ | ---------------------------------------------------------------- |
| 9  | Git Basics (init, add, commit, push, pull) | [Notes](./02-git-github/01-git-basics.md)                        |
| 10 | Branching                                  | [Notes](./02-git-github/02-branching.md)                         |
| 11 | Merge Conflict Resolution                  | [Notes](./02-git-github/03-merge-conflict-resolution.md)         |
| 12 | Pull Request & Code Review Workflow        | [Notes](./02-git-github/04-pull-request-code-review-workflow.md) |

### 3. JavaScript

The language itself, from variables, scope and functions through closures, `this`, prototypes, classes, promises and async/await, the event loop and memory management, plus error handling, debugging, modules and the browser basics: the DOM, events, the Fetch API, JSON, web storage, debounce and throttle.

Section README: [03-javascript](./03-javascript/README.md)

| #  | Topic                                                                     | Notes                                                               |
| -- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 13 | Variables & Scope (var, let, const, hoisting)                             | [Notes](./03-javascript/01-variables-scope.md)                      |
| 14 | Data Types & Type Coercion                                                | [Notes](./03-javascript/02-data-types-type-coercion.md)             |
| 15 | Functions & Arrow Functions                                               | [Notes](./03-javascript/03-functions-arrow-functions.md)            |
| 16 | Objects & Object Methods                                                  | [Notes](./03-javascript/04-objects-object-methods.md)               |
| 17 | Arrays & Array Methods (map, filter, reduce, forEach, etc.)               | [Notes](./03-javascript/05-arrays-array-methods.md)                 |
| 18 | Destructuring & Spread/Rest                                               | [Notes](./03-javascript/06-destructuring-spread-rest.md)            |
| 19 | Higher-Order Functions                                                    | [Notes](./03-javascript/07-higher-order-functions.md)               |
| 20 | Basic DSA / Problem Solving (arrays, strings, recursion, time complexity) | [Notes](./03-javascript/08-basic-dsa-problem-solving.md)            |
| 21 | Closures                                                                  | [Notes](./03-javascript/09-closures.md)                             |
| 22 | this Keyword                                                              | [Notes](./03-javascript/10-this-keyword.md)                         |
| 23 | Prototypes & Prototypal Inheritance                                       | [Notes](./03-javascript/11-prototypes-prototypal-inheritance.md)    |
| 24 | Classes & OOP                                                             | [Notes](./03-javascript/12-classes-oop.md)                          |
| 25 | Callbacks                                                                 | [Notes](./03-javascript/13-callbacks.md)                            |
| 26 | Promises                                                                  | [Notes](./03-javascript/14-promises.md)                             |
| 27 | Async/Await                                                               | [Notes](./03-javascript/15-async-await.md)                          |
| 28 | Event Loop, Call Stack, Microtask/Macrotask Queue                         | [Notes](./03-javascript/16-event-loop.md)                           |
| 29 | Error Handling (try/catch, custom errors)                                 | [Notes](./03-javascript/17-error-handling.md)                       |
| 30 | Debugging (Chrome DevTools)                                               | [Notes](./03-javascript/18-debugging.md)                            |
| 31 | Modules (import/export)                                                   | [Notes](./03-javascript/19-modules.md)                              |
| 32 | DOM Manipulation                                                          | [Notes](./03-javascript/20-dom-manipulation.md)                     |
| 33 | Event Bubbling, Capturing, Delegation                                     | [Notes](./03-javascript/21-event-bubbling-capturing-delegation.md)  |
| 34 | Fetch API                                                                 | [Notes](./03-javascript/22-fetch-api.md)                            |
| 35 | JSON                                                                      | [Notes](./03-javascript/23-json.md)                                 |
| 36 | LocalStorage, SessionStorage, Cookies                                     | [Notes](./03-javascript/24-localstorage-sessionstorage-cookies.md)  |
| 37 | Debounce & Throttle                                                       | [Notes](./03-javascript/25-debounce-throttle.md)                    |
| 38 | Memory Management & Garbage Collection                                    | [Notes](./03-javascript/26-memory-management-garbage-collection.md) |

### 4. TypeScript

Basic types, interfaces and type aliases, generics, and utility types. Every example was compiled with `tsc --strict` and run with Node.

Section README: [04-typescript](./04-typescript/README.md)

| #  | Topic                     | Notes                                                  |
| -- | ------------------------- | ------------------------------------------------------ |
| 39 | Basic Types               | [Notes](./04-typescript/01-basic-types.md)             |
| 40 | Interfaces & Type Aliases | [Notes](./04-typescript/02-interfaces-type-aliases.md) |
| 41 | Generics                  | [Notes](./04-typescript/03-generics.md)                |
| 42 | Utility Types             | [Notes](./04-typescript/04-utility-types.md)           |

### 5. React

Function components and props up through a Redux Toolkit store: reconciliation, state and effects, context, refs, custom hooks, memoization and error boundaries. Examples run in plain Node, through `jsdom` where a DOM is needed.

Section README: [05-react](./05-react/README.md)

| #  | Topic                                 | Notes                                                |
| -- | ------------------------------------- | ---------------------------------------------------- |
| 43 | Components & Props                    | [Notes](./05-react/01-components-props.md)           |
| 44 | Virtual DOM & Reconciliation          | [Notes](./05-react/02-virtual-dom-reconciliation.md) |
| 45 | Conditional Rendering                 | [Notes](./05-react/03-conditional-rendering.md)      |
| 46 | Keys & Lists                          | [Notes](./05-react/04-keys-and-lists.md)             |
| 47 | Event Handling                        | [Notes](./05-react/05-event-handling.md)             |
| 48 | useState                              | [Notes](./05-react/06-usestate.md)                   |
| 49 | Controlled vs Uncontrolled Components | [Notes](./05-react/07-controlled-uncontrolled.md)    |
| 50 | useEffect & Lifecycle                 | [Notes](./05-react/08-useeffect-lifecycle.md)        |
| 51 | Context API                           | [Notes](./05-react/09-context-api.md)                |
| 52 | Component Composition                 | [Notes](./05-react/10-component-composition.md)      |
| 53 | useRef                                | [Notes](./05-react/11-useref.md)                     |
| 54 | Custom Hooks                          | [Notes](./05-react/12-custom-hooks.md)               |
| 55 | useMemo & useCallback                 | [Notes](./05-react/13-usememo-usecallback.md)        |
| 56 | React.memo & Performance Optimization | [Notes](./05-react/14-react-memo-performance.md)     |
| 57 | Error Boundaries                      | [Notes](./05-react/15-error-boundaries.md)           |
| 58 | Redux Toolkit (Store, Slice, Thunk)   | [Notes](./05-react/16-redux-toolkit.md)              |

### 6. Testing (Basic)

Jest fundamentals, then React Testing Library: testing a component the way a user interacts with it. Checked by running `npx jest` against real test files.

Section README: [06-testing](./06-testing/README.md)

| #  | Topic                 | Notes                                             |
| -- | --------------------- | ------------------------------------------------- |
| 59 | Jest Fundamentals     | [Notes](./06-testing/01-jest-fundamentals.md)     |
| 60 | React Testing Library | [Notes](./06-testing/02-react-testing-library.md) |

### 7. Next.js

The App Router: routing and rendering (App Router vs Pages Router, Server and Client Components, layouts, dynamic routes, data fetching), then API routes, middleware, environment variables, metadata and SEO, and image optimization. Examples are real Next.js projects, built and run with `next build` and `next start`.

Section README: [07-nextjs](./07-nextjs/README.md)

| #  | Topic                                  | Notes                                                             |
| -- | -------------------------------------- | ----------------------------------------------------------------- |
| 61 | App Router vs Pages Router             | [Notes](./07-nextjs/01-app-router-vs-pages-router.md)             |
| 62 | Server Components vs Client Components | [Notes](./07-nextjs/02-server-components-vs-client-components.md) |
| 63 | Layouts                                | [Notes](./07-nextjs/03-layouts.md)                                |
| 64 | Dynamic Routing                        | [Notes](./07-nextjs/04-dynamic-routing.md)                        |
| 65 | Data Fetching (SSR, SSG, ISR)          | [Notes](./07-nextjs/05-data-fetching.md)                          |
| 66 | API Routes                             | [Notes](./07-nextjs/06-api-routes.md)                             |
| 67 | Middleware                             | [Notes](./07-nextjs/07-middleware.md)                             |
| 68 | Environment Variables                  | [Notes](./07-nextjs/08-environment-variables.md)                  |
| 69 | Metadata & SEO                         | [Notes](./07-nextjs/09-metadata-seo.md)                           |
| 70 | Image Optimization                     | [Notes](./07-nextjs/10-image-optimization.md)                     |

### 8. Node.js / Express

CommonJS modules, the event loop and the file system, then an Express 5 API: routing, middleware, REST conventions, error handling, configuration, a database connection, JWT authentication and CORS. Each topic ships a code folder.

Section README: [08-nodejs-express](./08-nodejs-express/README.md)

| #  | Topic                                 | Notes                                                        |
| -- | ------------------------------------- | ------------------------------------------------------------ |
| 71 | Modules (CommonJS)                    | [Notes](./08-nodejs-express/01-modules-commonjs.md)          |
| 72 | Event Loop in Node                    | [Notes](./08-nodejs-express/02-event-loop-in-node.md)        |
| 73 | File System (fs)                      | [Notes](./08-nodejs-express/03-file-system-fs.md)            |
| 74 | Request/Response Cycle                | [Notes](./08-nodejs-express/04-request-response-cycle.md)    |
| 75 | Express Routing                       | [Notes](./08-nodejs-express/05-express-routing.md)           |
| 76 | Middleware                            | [Notes](./08-nodejs-express/06-middleware.md)                |
| 77 | REST API Design                       | [Notes](./08-nodejs-express/07-rest-api-design.md)           |
| 78 | Error Handling Middleware             | [Notes](./08-nodejs-express/08-error-handling-middleware.md) |
| 79 | Environment Config                    | [Notes](./08-nodejs-express/09-environment-config.md)        |
| 80 | Connecting Database (Mongoose/Prisma) | [Notes](./08-nodejs-express/10-connecting-database.md)       |
| 81 | JWT Authentication                    | [Notes](./08-nodejs-express/11-jwt-authentication.md)        |
| 82 | CORS                                  | [Notes](./08-nodejs-express/12-cors.md)                      |

### 9. Web Security Basics

Input validation, password hashing, XSS and CSRF. The two browser topics were tested in a real Chromium, with an attacker's page and a victim's logged-in session.

Section README: [09-web-security-basics](./09-web-security-basics/README.md)

| #  | Topic                             | Notes                                                    |
| -- | --------------------------------- | -------------------------------------------------------- |
| 83 | Input Validation                  | [Notes](./09-web-security-basics/01-input-validation.md) |
| 84 | Password Hashing                  | [Notes](./09-web-security-basics/02-password-hashing.md) |
| 85 | XSS (Cross-Site Scripting)        | [Notes](./09-web-security-basics/03-xss.md)              |
| 86 | CSRF (Cross-Site Request Forgery) | [Notes](./09-web-security-basics/04-csrf.md)             |

### 10. API / System Design Basics

Pagination, caching and rate limiting. Tested against a 100,000-row SQLite table, a real Chromium, a real Redis server and real scrypt hashing.

Section README: [10-api-system-design-basics](./10-api-system-design-basics/README.md)

| #  | Topic         | Notes                                                      |
| -- | ------------- | ---------------------------------------------------------- |
| 87 | Pagination    | [Notes](./10-api-system-design-basics/01-pagination.md)    |
| 88 | Caching       | [Notes](./10-api-system-design-basics/02-caching.md)       |
| 89 | Rate Limiting | [Notes](./10-api-system-design-basics/03-rate-limiting.md) |

## Status

All 89 topics are written, in the order of the roadmap.
