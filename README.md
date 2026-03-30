# ScaleArch — VS Code Code Quality Extension
By Uday Verma (https://www.linkedin.com/in/uday-verma0906/)
> Real-time static analysis for TypeScript & JavaScript.  
> Catches DB anti-patterns, performance issues, SOLID violations, and code quality problems — **without AI, without cost, without internet.**

---

## Table of Contents

- [What it does](#what-it-does)
- [Rules reference](#rules-reference)
- [Installation](#installation)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Adding a new rule](#adding-a-new-rule--the-only-file-you-need)
  - [Type 1 — Regex rule](#type-1--regex-rule)
  - [Type 2 — AST rule](#type-2--ast-rule)
  - [Type 3 — Whole-AST rule](#type-3--whole-ast-rule)
- [Configuration](#configuration)
- [Contributing](#contributing)

---

## What it does

ScaleArch runs silently in the background as you type. It underlines problematic code with squiggly lines — red for errors, yellow for warnings, blue for hints — and shows a message explaining what's wrong and how to fix it.

It analyzes your code in two passes:

1. **Regex engine** — instant line-by-line scan for DB patterns, security issues, and performance anti-patterns.
2. **AST engine** — parses your code into a syntax tree to catch structural problems like SOLID violations, high complexity, and deep nesting that regex can never see.

No AI calls. No internet. Just fast, local, static analysis.

---

## Rules reference

### 🗄️ Database  *(regex engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `db/no-select-star` | Error | `SELECT *` — fetches all columns including unused ones |
| `db/no-where-clause` | Warning | `SELECT` without `WHERE` — full table scan risk |
| `db/no-limit` | Warning | Query without `LIMIT` — unbounded result set |
| `db/leading-wildcard-like` | Warning | `LIKE '%...'` — leading wildcard disables index |
| `db/query-in-loop` | Error | SQL query inside a loop — N+1 problem |

### ⚡ Performance  *(regex engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `perf/json-parse-in-loop` | Warning | `JSON.parse()` called inside a loop |
| `perf/console-log-production` | Info | `console.log()` left in code |
| `perf/sync-fs-call` | Error | `readFileSync`, `writeFileSync` etc. — blocks event loop |
| `perf/new-object-in-loop` | Warning | Object/array allocation inside a loop — GC pressure |

### 🔒 Security  *(regex engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `security/hardcoded-secret` | Error | Hardcoded passwords, API keys, tokens |
| `security/eval-usage` | Error | `eval()` — arbitrary code execution risk |

### 🏗️ SOLID Principles  *(AST engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `solid/srp` | Warning | Class with 10+ methods — Single Responsibility violation |
| `solid/dip` | Warning | Constructor uses `new ConcreteClass()` — Dependency Inversion violation |

### 🧹 Code Quality  *(AST engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `quality/function-too-long` | Warning | Function over 20 lines |
| `quality/high-complexity` | Warning | Cyclomatic complexity over 5 |
| `quality/deep-nesting` | Warning | Block nesting depth over 4 |
| `quality/too-many-params` | Warning | Function with 5+ parameters |
| `quality/duplicate-string` | Info | Same string literal used 3+ times |

### ✏️ Custom Rules  *(your additions)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `custom/settimeout-zero` | Warning | `setTimeout(fn, 0)` — use `queueMicrotask()` instead |
| `custom/empty-catch` | Warning | Empty catch block — error silently swallowed |
| `custom/boolean-param` | Info | Boolean function parameter — design smell |
| `custom/too-many-imports` | Info | File with 15+ imports — possible SRP violation |

---

## Installation

**Prerequisites:** Node.js 18+, VS Code 1.85+

```bash
# 1. Clone the repo
git clone https://github.com/your-username/ScaleArch.git
cd scalearch

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Open in VS Code
code .
```

Then press **F5** to launch the Extension Development Host — a second VS Code window where the extension runs live. Open any `.ts` or `.js` file and the analysis starts automatically.

To run the test file that triggers every rule:
```
open test/test_all_rules.ts in the Extension Development Host
```

---

## Project structure

```
scalearch/
├── src/
│   ├── extension.ts          # Entry point — registers commands, sets up debounce
│   ├── analyzer.ts           # Orchestrates both engines for a given document
│   │
│   ├── engines/
│   │   ├── regexEngine.ts    # Runs all regex rules line-by-line
│   │   └── astEngine.ts      # Parses code into AST, walks nodes, runs AST rules
│   │
│   └── rules/
│       ├── types.ts          # Shared interfaces: RuleResult, RegexRule, AstRule
│       ├── regexRules.ts     # Core regex rules (DB, perf, security) — don't edit
│       ├── astRules.ts       # Core AST rules (SOLID, complexity) — don't edit
│       └── customRules.ts    # ← YOUR FILE. Add all new rules here
│
├── test/
│   └── test_all_rules.ts     # Sample file that triggers every single rule
│
├── package.json              # Extension manifest, VS Code config contributions
└── tsconfig.json
```

---

## How it works

### The two-engine architecture

```
Your file
   │
   ├──▶  RegexEngine
   │        └── splits into lines
   │        └── runs DB_RULES + PERF_RULES + SECURITY_RULES + CUSTOM_REGEX_RULES
   │        └── returns Diagnostic[]
   │
   └──▶  AstEngine
            └── parses entire file into AST (@typescript-eslint/typescript-estree)
            └── walks every node in the tree
            └── calls PER_NODE_CHECKS[] + CUSTOM_AST_CHECKS[] on every node
            └── also runs whole-AST checks (duplicate strings, custom whole-AST rules)
            └── returns Diagnostic[]

Both results combined → shown as squiggly lines in VS Code
```

### How custom rules plug in

`customRules.ts` exports three things. The engines import them and merge automatically — you never touch the engine files:

```
customRules.ts
   │
   ├── CUSTOM_REGEX_RULES  ──▶  regexEngine.ts  (spread into ALL_REGEX_RULES)
   ├── CUSTOM_AST_CHECKS   ──▶  astEngine.ts    (spread into PER_NODE_CHECKS)
   └── customWholeAstChecks() ──▶  astEngine.ts  (called after the node walk)
```

### Debouncing for large files

The extension waits until you stop typing for 600ms before running. This keeps it responsive even on large files.

---

## Adding a new rule — the only file you need

> **You only ever edit `src/rules/customRules.ts`.**  
> Core files stay untouched. Your rules are picked up automatically.

The file has three clearly labelled sections. Pick the one that fits your rule.

---

### Type 1 — Regex rule

**Use when:** the problem can be spotted on a single line with a regular expression.

**Good for:** `eval()`, `SELECT *`, `console.log`, hardcoded secrets, specific API misuse.

Open `src/rules/customRules.ts` and add an object to `CUSTOM_REGEX_RULES`:

```typescript
// src/rules/customRules.ts  →  SECTION 1

export const CUSTOM_REGEX_RULES: RegexRule[] = [

  {
    id: 'custom/your-rule-id',        // unique ID, format: 'category/rule-name'
    category: 'performance',          // database | performance | solid | code-quality | security
    severity: vscode.DiagnosticSeverity.Warning,   // Error | Warning | Information | Hint
    message: 'Short message shown in the squiggly tooltip',
    hint: 'Longer explanation shown on hover. Explain WHY it is a problem and HOW to fix it.',
    test: (line, allLines, lineIndex) => {
      // Return true  → flag this line
      // Return false → skip
      return /your-pattern/.test(line);
    },
  },

];
```

The `test` function receives three arguments — you only need all three when looking at context around a line:

```typescript
// Simple: check only the current line
test: (line) => /setTimeout\s*\(.*,\s*0\s*\)/.test(line),

// Context-aware: look back 5 lines to detect a loop
test: (line, allLines, lineIndex) => {
  if (!/JSON\.parse\s*\(/.test(line)) return false;
  for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
    if (/\b(for|while|forEach|map)\b/.test(allLines[i])) return true;
  }
  return false;
},
```

**Done. No other file to edit.**

---

### Type 2 — AST rule

**Use when:** the problem requires understanding code structure — you need to know about functions, classes, parameter counts, nesting depth, method lists, etc.

**Good for:** function length, class complexity, SOLID violations, constructor patterns.

#### How a per-node check works

The AST engine visits **every node** in your code's syntax tree. Your function is called once per node. Return `null` to skip, return a `RuleResult` to flag it.

```typescript
// Pseudocode of what happens internally:
for every node in the AST:
  checkSRP(node)           → null or result
  checkDIP(node)           → null or result
  checkFunctionLength(node)→ null or result
  ...
  checkYourRule(node)      → null or result   ← your function runs here
```

Open `src/rules/customRules.ts` and add a function, then register it:

```typescript
// src/rules/customRules.ts  →  SECTION 2

// Step A: write the function
function checkNoMagicNumbers(node: any): RuleResult | null {
  // 1. Filter — only look at the node type you care about
  if (node.type !== 'Literal') return null;
  if (typeof node.value !== 'number') return null;

  // 2. Apply your condition
  const ALLOWED = [0, 1, -1, 2, 100];
  if (ALLOWED.includes(node.value)) return null;

  // 3. Return a result
  return {
    range: makeRange(node),           // highlights the node in the editor
    code: 'custom/magic-number',
    message: `Magic number ${node.value} — extract to a named constant`,
    hint: `Magic numbers make code hard to understand and maintain. Extract to: const MAX_RETRIES = ${node.value}`,
    severity: vscode.DiagnosticSeverity.Information,
  };
}

// Step B: add it to the export array — that's all
export const CUSTOM_AST_CHECKS: Array<(node: any) => RuleResult | null> = [
  checkEmptyCatch,
  checkBooleanParam,
  checkNoMagicNumbers,   // ← add here
];
```

**Done. No other file to edit.**

#### Common AST node types

| Node type | When it appears |
|---|---|
| `FunctionDeclaration` | `function foo() {}` |
| `FunctionExpression` | `const foo = function() {}` |
| `ArrowFunctionExpression` | `const foo = () => {}` |
| `ClassDeclaration` | `class Foo {}` |
| `MethodDefinition` | A method inside a class body |
| `BlockStatement` | Any `{ }` block |
| `IfStatement` | `if (...)` |
| `CallExpression` | Any function call: `foo()`, `bar.baz()` |
| `NewExpression` | `new Foo()` |
| `Literal` | String, number, boolean literal values |
| `CatchClause` | The `catch (e) { }` block |
| `ImportDeclaration` | `import ... from '...'` |

> **Tip:** Paste any code into [astexplorer.net](https://astexplorer.net) and select `@typescript-eslint/parser` to see the exact shape of any node. This is the fastest way to write new AST rules.

---

### Type 3 — Whole-AST rule

**Use when:** you need to look at the entire file at once — for example, counting all imports, finding all usages of a pattern, or detecting repeated identifiers across the file.

Open `src/rules/customRules.ts` and add a function to `customWholeAstChecks`:

```typescript
// src/rules/customRules.ts  →  SECTION 3

// Step A: write the function (returns RuleResult[], not null)
function checkNoDefaultExport(ast: any): RuleResult[] {
  const exports = getAllNodes(ast, ['ExportDefaultDeclaration']);
  if (exports.length === 0) return [];

  return [{
    range: makeRange(exports[0]),
    code: 'custom/no-default-export',
    message: 'Avoid default exports — use named exports for better refactoring support',
    hint: 'Named exports make imports explicit and enable better IDE rename support. Replace: export default foo → export { foo }',
    severity: vscode.DiagnosticSeverity.Information,
  }];
}

// Step B: call it inside customWholeAstChecks
export function customWholeAstChecks(ast: any): RuleResult[] {
  return [
    ...checkTooManyImports(ast),
    ...checkNoDefaultExport(ast),   // ← add here
  ];
}
```

**Done. No other file to edit.**

---

## Configuration

Users can tune thresholds in VS Code settings (`Ctrl+,` → search "ScaleArch"):

| Setting | Default | Description |
|---|---|---|
| `scalearch.enableDatabase` | `true` | Enable database rules |
| `scalearch.enablePerformance` | `true` | Enable performance rules |
| `scalearch.enableSolid` | `true` | Enable SOLID rules |
| `scalearch.enableSecurity` | `true` | Enable security rules |
| `scalearch.maxMethodsPerClass` | `10` | SRP: max methods before warning |
| `scalearch.maxFunctionLines` | `20` | Max lines per function |
| `scalearch.maxCyclomaticComplexity` | `5` | Max cyclomatic complexity |
| `scalearch.maxParams` | `4` | Max function parameters |

---

## Contributing

Fork the repo, add your rules to `customRules.ts`, and open a PR.

### Checklist for a new rule PR

- [ ] Rule added to the correct section in `customRules.ts`
- [ ] Test case added to `test/test_all_rules.ts` that triggers the rule
- [ ] Rule added to the custom rules table in this README
- [ ] Setting added to `package.json` if the rule has a configurable threshold

### Ideas for new rules

**SOLID**
- Open/Closed: class modified directly instead of extended
- Liskov: method override that changes return type
- Interface Segregation: interface with too many methods

**Performance**
- `await` inside a loop (use `Promise.all` instead)
- Array `.find()` called multiple times on the same array in a function
- Missing memoization on expensive recursive functions

**Code quality**
- Magic numbers (unexplained numeric literals)
- TODO/FIXME comments left in code
- Deeply chained `.then().then().then()` without `async/await`
- Functions with boolean parameters (Single Responsibility smell)
- Empty catch blocks (already included as an example)

---

*Built with [@typescript-eslint/typescript-estree](https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/typescript-estree) for AST parsing.*

---

## Using ScaleArch as a Company-Wide Coding Standard

ScaleArch is designed to be **forked and customised per team or company.**  
The idea is simple: your engineering team defines what "bad code" means for your codebase — and ScaleArch enforces it automatically in every developer's editor, from day one.

### The workflow

```
Your company forks ScaleArch
   └── Engineering lead adds company rules to customRules.ts
         ├── "Never use our deprecated PaymentV1 API"
         ├── "All DB queries must go through our QueryBuilder class"
         ├── "No raw fetch() calls — use our internal HttpClient"
         └── "Every async function must have a try/catch"
   └── Repo is shared internally (private GitHub / GitLab / Bitbucket)
   └── Developers install the extension from source (F5 or vsce package)
   └── Rules fire live in every developer's editor as they write code
```

No CI pipeline changes. No PR review comments about the same issue repeatedly. The rule fires the moment the developer writes the problematic code.

---

### Real-world rule examples for companies

#### Enforce internal library usage

```typescript
// customRules.ts — Section 1 (Regex)
// Prevent direct fetch() — company uses internal HttpClient wrapper

{
  id: 'company/no-raw-fetch',
  category: 'code-quality',
  severity: vscode.DiagnosticSeverity.Error,
  message: 'Direct fetch() is not allowed — use HttpClient from @company/core',
  hint: 'Our HttpClient handles auth tokens, retries, and error logging automatically. Import it: import { HttpClient } from "@company/core"',
  test: (line) =>
    /\bfetch\s*\(/.test(line) &&
    !/\/\//.test(line.trimStart()),  // ignore commented lines
},
```

#### Ban deprecated internal APIs

```typescript
// Prevent usage of old payment API — deprecated since v2

{
  id: 'company/no-payment-v1',
  category: 'security',
  severity: vscode.DiagnosticSeverity.Error,
  message: 'PaymentServiceV1 is deprecated and non-compliant — use PaymentServiceV2',
  hint: 'PaymentServiceV1 does not meet PCI-DSS v4 requirements. Migrate to PaymentServiceV2. See: confluence.company.com/payment-migration',
  test: (line) => /PaymentServiceV1|paymentV1|payment_v1/i.test(line),
},
```

#### Enforce try/catch on all async functions

```typescript
// customRules.ts — Section 2 (AST)
// Every async function must have at least one try/catch block

function checkAsyncMustHaveTryCatch(node: any): RuleResult | null {
  const fnTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
  if (!fnTypes.includes(node.type)) return null;
  if (!node.async) return null;  // only async functions

  const body = node.body?.body ?? [];
  const hasTryCatch = body.some((s: any) => s.type === 'TryStatement');
  if (hasTryCatch) return null;

  return {
    range: makeRange(node),
    code: 'company/async-no-try-catch',
    message: 'Async function has no try/catch — unhandled promise rejections crash the server',
    hint: 'Company policy requires all async functions to handle errors explicitly. Wrap the body in try/catch or use our withErrorHandling() wrapper.',
    severity: vscode.DiagnosticSeverity.Error,
  };
}
```

#### Enforce query builder pattern

```typescript
// Prevent raw SQL strings — company uses QueryBuilder for all DB access

{
  id: 'company/no-raw-sql',
  category: 'database',
  severity: vscode.DiagnosticSeverity.Error,
  message: 'Raw SQL strings are not allowed — use QueryBuilder from @company/db',
  hint: 'Raw SQL bypasses our query logging, parameterisation, and audit trail. Use: import { QueryBuilder } from "@company/db"',
  test: (line) =>
    /`?\s*(SELECT|INSERT|UPDATE|DELETE)\s+/i.test(line) &&
    !/QueryBuilder/.test(line),
},
```

#### Flag console.log in specific directories (e.g. payments module)

```typescript
// Stricter logging rules for sensitive modules

{
  id: 'company/no-log-in-payments',
  category: 'security',
  severity: vscode.DiagnosticSeverity.Error,
  message: 'console.log() in payments module may leak sensitive data — use AuditLogger',
  hint: 'The payments module handles PCI data. Use AuditLogger which redacts card numbers and PII automatically. Import: import { AuditLogger } from "@company/audit"',
  test: (line) => /console\.(log|warn|info)\s*\(/.test(line),
  // Note: activate this rule only for payment-related files by checking
  // the document path in the engine, or by keeping it in a separate
  // customRules file loaded conditionally
},
```

---

### How to distribute to your team

**Option A — Private repo (recommended)**

1. Fork ScaleArch into your company's private GitHub/GitLab
2. Add your rules to `customRules.ts` and commit
3. Share the repo link with developers
4. Developers clone and run:
   ```bash
   npm install && npm run compile
   # Then F5 in VS Code, or:
   vsce package   # produces a .vsix file
   ```
5. Install the `.vsix` directly in VS Code:
   ```
   Extensions panel → ··· menu → Install from VSIX
   ```

**Option B — Package as `.vsix` and distribute**

```bash
npm install -g vsce
vsce package
# → produces scalearch-0.1.0.vsix
```

Share the `.vsix` file via Slack, email, or your internal package registry. Developers install it once and get all company rules automatically.

**Option C — Publish to VS Code Marketplace (for public rules)**

```bash
vsce publish
```

Any developer installing `ScaleArch` gets your rules. Good for open-source teams with public coding standards.

---

### Tips for engineering leads

**Keep rule IDs namespaced** — prefix with your company name so they're easy to find and never clash with core rules:
```
company/no-raw-fetch
company/no-payment-v1
acme/require-jsdoc
```

**Link to internal docs in the `hint` field** — developers should be able to understand *why* the rule exists without asking anyone:
```typescript
hint: 'See our API guidelines: confluence.company.com/api-standards#http-clients'
```

**Use `DiagnosticSeverity.Error` sparingly** — reserve errors for things that will genuinely break production or violate compliance. Use `Warning` for style/convention rules so developers aren't blocked on legitimate work.

**Add test cases for every company rule** in `test/test_all_rules.ts` — this is your living documentation of what the rule catches and what it doesn't.
