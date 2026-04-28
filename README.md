# ScaleArch — VS Code Code Quality Extension
By [Uday Verma](https://www.linkedin.com/in/uday-verma0906/)

> Real-time static analysis for TypeScript, JavaScript, Python, Java, and C++.  
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
  - [Type 2 — JS/TS AST rule](#type-2--jsts-ast-rule)
  - [Type 3 — Whole-AST rule](#type-3--whole-ast-rule)
  - [Type 4 — Python AST rule](#type-4--python-ast-rule)
  - [Type 5 — Java AST rule](#type-5--java-ast-rule)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [Using ScaleArch as a Company-Wide Coding Standard](#using-scalearch-as-a-company-wide-coding-standard)

---

## What it does

ScaleArch runs silently in the background as you type. It underlines problematic code with squiggly lines — red for errors, yellow for warnings, blue for hints — and shows a message explaining what's wrong and how to fix it.

It analyzes your code in two passes:

1. **Regex engine** — instant line-by-line scan for DB patterns, security issues, and performance anti-patterns. Runs on all supported languages.
2. **AST engine** — parses your code into a syntax tree to catch structural problems that regex can never see. Routes to the correct engine per language via the AstGateway.

No AI calls. No internet. Just fast, local, static analysis.

---

## Rules reference

### 🗄️ Database *(regex — all languages)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `db/no-select-star` | Error | `SELECT *` — fetches all columns including unused ones |
| `db/no-where-clause` | Warning | `SELECT` without `WHERE` — full table scan risk |
| `db/no-limit` | Warning | Query without `LIMIT` — unbounded result set |
| `db/leading-wildcard-like` | Warning | `LIKE '%...'` — leading wildcard disables index |
| `db/query-in-loop` | Error | SQL query inside a loop — N+1 problem |
| `db/subquery-in-clause` | Warning | `IN (SELECT ...)` — subquery performance issue |
| `db/delete-without-where` | Error | `DELETE` without `WHERE` — wipes entire table |
| `db/update-without-where` | Error | `UPDATE` without `WHERE` — updates every row |

### ⚡ Performance *(regex)*

| Rule ID | Languages | What it catches |
|---|---|---|
| `perf/json-parse-in-loop` | JS/TS | `JSON.parse()` called inside a loop |
| `perf/console-log-production` | JS/TS | `console.log()` left in code |
| `perf/sync-fs-call` | JS/TS | `readFileSync`, `writeFileSync` — blocks event loop |
| `perf/new-object-in-loop` | JS/TS | Object/array allocation inside a loop |
| `perf/await-in-loop` | JS/TS | `await` inside a loop — use Promise.all() |
| `py/print-in-production` | Python | `print()` instead of logging module |
| `py/new-object-in-loop` | Python | List/dict allocation inside a loop |
| `java/string-concat-in-loop` | Java | String `+=` in loop — use StringBuilder |
| `java/new-object-in-loop` | Java | Object allocation inside a loop |
| `cpp/cout-in-production` | C/C++ | `cout` in production — use spdlog or glog |
| `cpp/printf-in-production` | C/C++ | `printf` — use logging framework |

### 🔒 Security *(regex)*

| Rule ID | Languages | What it catches |
|---|---|---|
| `security/hardcoded-secret` | All | Hardcoded passwords, API keys, tokens |
| `security/eval-usage` | JS/TS | `eval()` — arbitrary code execution risk |
| `security/hardcoded-ip` | All | Hardcoded IP addresses |
| `security/console-log-sensitive` | JS/TS | Logging passwords, tokens, secrets |
| `py/eval-usage` | Python | `eval()` security risk |
| `py/exec-usage` | Python | `exec()` security risk |
| `py/shell-true` | Python | `subprocess shell=True` injection risk |
| `java/hardcoded-secret` | Java | Secrets hardcoded in string literals |
| `java/sql-concatenation` | Java | SQL injection via string concatenation |
| `cpp/gets-usage` | C/C++ | `gets()` — buffer overflow, removed in C11 |
| `cpp/strcpy-usage` | C/C++ | `strcpy()` — no bounds checking |
| `cpp/sprintf-usage` | C/C++ | `sprintf()` — no bounds checking |

### 🏗️ SOLID Principles *(JS/TS AST engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `solid/srp` | Warning | Class with 10+ methods — Single Responsibility violation |
| `solid/dip` | Warning | Constructor uses `new ConcreteClass()` — Dependency Inversion violation |

### 🧹 Code Quality *(JS/TS AST engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `quality/function-too-long` | Warning | Function over 20 lines |
| `quality/high-complexity` | Warning | Cyclomatic complexity over 5 |
| `quality/deep-nesting` | Warning | Block nesting depth over 4 |
| `quality/too-many-params` | Warning | Function with 5+ parameters |
| `quality/duplicate-string` | Info | Same string literal used 3+ times |

### 🐍 Python Code Quality *(Python AST engine — requires Python 3.8+)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `py/ast-function-too-long` | Warning | Function body over 30 lines |
| `py/ast-class-too-many-methods` | Warning | Class with more than 10 methods |
| `py/ast-missing-docstring` | Hint | Public function or class has no docstring |
| `py/ast-no-type-hints` | Hint | Function has no parameter or return type annotations |
| `py/ast-init-too-complex` | Warning | `__init__` assigns more than 8 instance variables |

### 🔧 Python Code Quality *(regex engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `py/bare-except` | Warning | Bare `except:` — catches KeyboardInterrupt and SystemExit |
| `py/mutable-default-arg` | Error | Mutable default argument — shared across all calls |
| `py/broad-exception-catch` | Warning | `except Exception` — too broad |
| `py/assert-in-production` | Warning | `assert` — stripped by `python -O` flag |

### ☕ Java Code Quality *(regex engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `java/system-out-println` | Info | Use SLF4J or Log4j2 instead |
| `java/empty-catch` | Warning | Silently swallowed exceptions |
| `java/catch-generic-exception` | Warning | Catching broad Exception type |
| `java/raw-types` | Warning | `List`, `Map`, `Set` without generic type parameter |

### ☕ Java AST Rules *(tree-sitter-java engine — v2.0.0+)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `java/ast-method-too-long` | Warning | Method body over 40 lines |
| `java/ast-class-too-many-methods` | Warning | Class with more than 10 methods (SRP) |
| `java/ast-too-many-params` | Warning | Method with more than 4 parameters |
| `java/ast-constructor-too-many-params` | Warning | Constructor with more than 4 parameters — use Builder |
| `java/ast-empty-catch` | Error | Empty catch block — exception silently swallowed |
| `java/ast-deep-nesting` | Warning | Nesting depth over 3 levels |
| `java/ast-too-many-fields` | Warning | Class with more than 8 fields — God Object |
| `java/ast-magic-number` | Info | Numeric literal not assigned to a named constant |
| `java/ast-interface-too-large` | Warning | Interface with more than 5 methods — ISP violation |
| `java/ast-public-field` | Warning | Public non-final field — breaks encapsulation |
| `java/ast-system-exit` | Error | `System.exit()` outside main() — kills entire JVM |
| `java/ast-thread-sleep` | Warning | `Thread.sleep()` — use ScheduledExecutorService |
| `java/ast-string-equals-compare` | Error | String compared with `==` or `!=` — use `.equals()` |

### ⚙️ C/C++ Code Quality *(regex engine)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `cpp/raw-new-without-delete` | Warning | Use smart pointers instead |
| `cpp/raw-delete` | Warning | Use RAII via `unique_ptr` / `shared_ptr` |
| `cpp/define-instead-of-const` | Warning | Use `constexpr` or `const` instead |
| `cpp/using-namespace-std` | Warning | Pollutes the global namespace |
| `cpp/c-style-cast` | Warning | Use `static_cast`, `dynamic_cast`, or `reinterpret_cast` |

### ✏️ Custom Rules *(your additions)*

| Rule ID | Severity | What it catches |
|---|---|---|
| `custom/settimeout-zero` | Warning | `setTimeout(fn, 0)` — use `queueMicrotask()` instead |
| `custom/empty-catch` | Warning | Empty catch block — error silently swallowed |
| `custom/boolean-param` | Info | Boolean function parameter — design smell |
| `custom/too-many-imports` | Info | File with 15+ imports — possible SRP violation |

---

## Installation

**Prerequisites:** Node.js 18+, VS Code 1.85+, Python 3.8+ *(for Python AST rules)*

```bash
# 1. Clone the repo
git clone https://github.com/Udayverma0906/ScaleArch.git
cd ScaleArch

# 2. Install dependencies
npm install

# 3. Compile
npm run compile

# 4. Open in VS Code
code .
```

Then press **F5** to launch the Extension Development Host. Open any supported file and analysis starts automatically.

**Supported file types:** `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`

To test Python AST rules — open `testfiles/test_python_rules.py` in the Extension Development Host.  
To test Java AST rules — open `testfiles/test_java_rules.java` in the Extension Development Host.

---

## Project structure

```
scalearch/
├── src/
│   ├── extension.ts              # Entry point — registers commands, sets up debounce
│   ├── analyzer.ts               # Orchestrates both engines for a given document
│   │
│   ├── engines/
│   │   ├── regexEngine.ts        # Runs all regex rules line-by-line (all languages)
│   │   ├── astGateway.ts         # Routes to correct AST engine by language ID
│   │   ├── jsTsAstEngine.ts      # JS/TS AST engine — @typescript-eslint/typescript-estree
│   │   ├── pythonAstEngine.ts    # Python AST engine — Python built-in ast module (child process)
│   │   └── javaAstEngine.ts      # Java AST engine — tree-sitter-java (native binding)
│   │
│   └── rules/
│       ├── types.ts              # Shared interfaces: RuleResult, RegexRule, PythonNode, JavaNode
│       ├── regexRules.ts         # Core regex rules — don't edit
│       ├── astRules.ts           # Core JS/TS AST rules — don't edit
│       ├── pythonAstRules.ts     # Core Python AST rules — don't edit
│       ├── javaAstRules.ts       # Core Java AST rules — don't edit
│       └── customRules.ts        # ← YOUR FILE. Add all new rules here
│
├── testfiles/                    # Test files for all languages (not shipped in extension)
│   ├── test_ts_rules.ts
│   ├── test_python_rules.py
│   ├── test_java_rules.java
│   └── test_cpp_rules.cpp
│
├── package.json                  # Extension manifest, VS Code config contributions
├── webpack.config.js             # Bundles src/ into dist/extension.js
└── tsconfig.json
```

---

## How it works

### The two-engine architecture

```
Your file (any supported language)
   │
   ├──▶  RegexEngine  (all languages)
   │        └── splits into lines
   │        └── runs DB + PERF + SECURITY + PYTHON/JAVA/CPP + CUSTOM_REGEX_RULES
   │        └── filters by rule.languages field
   │        └── returns Diagnostic[]
   │
   └──▶  AstGateway
            ├── JS/TS  →  JsTsAstEngine
            │               └── @typescript-eslint/typescript-estree (bundled by webpack)
            │               └── SOLID + quality + CUSTOM_AST_CHECKS
            │
            ├── Python →  PythonAstEngine
            │               └── Python built-in ast module (child process, requires Python 3.8+)
            │               └── 5 Python AST rules + CUSTOM_PYTHON_AST_RULES
            │
            ├── Java   →  JavaAstEngine
            │               └── tree-sitter-java (native Node.js binding, no child process)
            │               └── 13 Java AST rules + CUSTOM_JAVA_AST_RULES
            │
            └── C/C++  →  CppAstEngine (v3.0 — planned)

Both results combined → shown as squiggly lines in VS Code
```

### AstGateway — adding new languages

The gateway pattern means adding a new language AST engine is one new file and one line:

```typescript
// src/engines/astGateway.ts
this.engines = [
  { langs: ['typescript', 'javascript', ...], engine: new JsTsAstEngine() },
  { langs: ['python'],                         engine: new PythonAstEngine() },
  { langs: ['java'],                           engine: new JavaAstEngine() },
  // { langs: ['cpp', 'c'], engine: new CppAstEngine() },  ← v3.0
];
```

### Debouncing

The extension waits 600ms after you stop typing before running. This keeps it responsive even on large files.

---

## Adding a new rule — the only file you need

> **You only ever edit `src/rules/customRules.ts`.**  
> Core files stay untouched. Your rules are picked up automatically.

The file has five clearly labelled sections.

---

### Type 1 — Regex rule

**Use when:** the problem can be spotted on a single line. Works on all languages.

```typescript
// src/rules/customRules.ts → SECTION 1

export const CUSTOM_REGEX_RULES: RegexRule[] = [
  {
    id: 'custom/your-rule-id',
    category: 'performance',          // database | performance | solid | code-quality | security
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Short message in the squiggly tooltip',
    hint: 'Longer explanation shown on hover. WHY it is wrong and HOW to fix it.',
    languages: ['python'],            // optional — omit to run on all languages
    test: (line, allLines, lineIndex) => {
      return /your-pattern/.test(line);
    },
  },
];
```

---

### Type 2 — JS/TS AST rule

**Use when:** you need code structure — function length, class complexity, constructor patterns.

```typescript
// src/rules/customRules.ts → SECTION 2

function checkNoMagicNumbers(node: any): RuleResult | null {
  if (node.type !== 'Literal') return null;
  if (typeof node.value !== 'number') return null;

  const ALLOWED = [0, 1, -1, 2, 100];
  if (ALLOWED.includes(node.value)) return null;

  return {
    range: makeRange(node),
    code: 'custom/magic-number',
    message: `Magic number ${node.value} — extract to a named constant`,
    hint: `Named constants make code self-documenting. const MAX_RETRIES = ${node.value}`,
    severity: vscode.DiagnosticSeverity.Information,
  };
}

export const CUSTOM_AST_CHECKS: Array<(node: any) => RuleResult | null> = [
  checkEmptyCatch,
  checkBooleanParam,
  checkNoMagicNumbers,   // ← add here
];
```

> **Tip:** Paste any code into [astexplorer.net](https://astexplorer.net) and select `@typescript-eslint/parser` to see exact node shapes.

---

### Type 3 — Whole-AST rule

**Use when:** you need to look at the entire file at once — counting all imports, finding repeated identifiers.

```typescript
// src/rules/customRules.ts → SECTION 3

function checkNoDefaultExport(ast: any): RuleResult[] {
  const exports = getAllNodes(ast, ['ExportDefaultDeclaration']);
  if (exports.length === 0) return [];

  return [{
    range: makeRange(exports[0]),
    code: 'custom/no-default-export',
    message: 'Avoid default exports — use named exports for better refactoring support',
    hint: 'Named exports make imports explicit. Replace: export default foo → export { foo }',
    severity: vscode.DiagnosticSeverity.Information,
  }];
}

export function customWholeAstChecks(ast: any): RuleResult[] {
  return [
    ...checkTooManyImports(ast),
    ...checkNoDefaultExport(ast),   // ← add here
  ];
}
```

---

### Type 4 — Python AST rule

**Use when:** you need Python code structure — function length, class design, docstring presence, type hints.

Requires Python 3.8+ installed. The function receives one Python AST node at a time.

```typescript
// src/rules/customRules.ts → SECTION 4

function checkPyNoPassInExcept(
  node: any,
  _cfg: any,
  makeDiag: any
): vscode.Diagnostic | null {
  if (node._type !== 'ExceptHandler') return null;

  const body = node.body ?? [];
  const isOnlyPass = body.length === 1 && body[0]._type === 'Pass';
  if (!isOnlyPass) return null;

  return makeDiag(
    node,
    'Empty except block — exception is silently swallowed',
    vscode.DiagnosticSeverity.Warning,
    'custom/py-empty-except'
  );
}

export const CUSTOM_PYTHON_AST_RULES: PythonRuleCheck[] = [
  checkPyStringConcat,
  checkPyNoPassInExcept,   // ← add here
];
```

**Key Python node properties** (`_type`, `lineno` 1-based, `col_offset` 0-based):

| Node | When it appears |
|---|---|
| `FunctionDef` / `AsyncFunctionDef` | Function definitions |
| `ClassDef` | Class definitions |
| `Assign` | `x = value` assignments |
| `Return` | Return statements |
| `Import` / `ImportFrom` | Import statements |
| `ExceptHandler` | `except` blocks in try/except |
| `Call` | Any function call |
| `BinOp` | Binary operations (`+`, `-`, `*` etc.) |

> **Tip:** Run `python3 -c "import ast; print(ast.dump(ast.parse('your code here')))"` to see exact node shapes.

---

### Type 5 — Java AST rule

**Use when:** you need Java code structure — method length, field visibility, empty catch blocks, etc.

Uses tree-sitter-java — no JDK required. The function receives one tree-sitter node at a time.

```typescript
// src/rules/customRules.ts → SECTION 5

export const CUSTOM_JAVA_AST_RULES: JavaRuleCheck[] = [
  (node, _cfg, makeDiag) => {
    if (node.type !== 'method_invocation') return null;

    const obj    = node.childForFieldName('object')?.text;
    const method = node.childForFieldName('name')?.text;

    if (obj !== 'System.out' || method !== 'println') return null;

    return makeDiag(
      node,
      'Use a logger instead of System.out.println',
      vscode.DiagnosticSeverity.Information,
      'custom/java-no-sysout',
      'System.out has no log levels and cannot be disabled. Use SLF4J: logger.info("message")'
    );
  },
];
```

**Key differences from Python rules — tree-sitter vs Python AST:**

| Property | Python AST | Java tree-sitter |
|---|---|---|
| Node type | `node._type` (underscore) | `node.type` (no underscore) |
| Line number | `node.lineno` (1-based) | `node.startPosition.row` (0-based) |
| Node name | `node.name` (string) | `node.childForFieldName("name")?.text` |
| Children | `node.body` (list) | `node.namedChildren` (excludes syntax tokens) |

**Common Java tree-sitter node types:**

| Node type | What it represents |
|---|---|
| `method_declaration` | Method definitions |
| `class_declaration` | Class definitions |
| `constructor_declaration` | Constructor definitions |
| `catch_clause` | catch blocks in try/catch |
| `field_declaration` | Field/property declarations |
| `interface_declaration` | Interface definitions |
| `method_invocation` | Any method call |
| `binary_expression` | `a == b`, `a + b` etc. |

---

## Configuration

Users can tune thresholds in VS Code settings (`Ctrl+,` → search "ScaleArch"):

| Setting | Default | Description |
|---|---|---|
| `scalearch.enableDatabase` | `true` | Enable database rules |
| `scalearch.enablePerformance` | `true` | Enable performance rules |
| `scalearch.enableSolid` | `true` | Enable SOLID rules |
| `scalearch.enableSecurity` | `true` | Enable security rules |
| `scalearch.enableCodeQuality` | `true` | Enable code quality rules |
| `scalearch.enablePython` | `true` | Enable Python regex rules |
| `scalearch.enableJava` | `true` | Enable Java regex rules |
| `scalearch.enableCpp` | `true` | Enable C/C++ regex rules |
| `scalearch.enablePythonAst` | `true` | Enable Python AST rules (requires Python 3.8+) |
| `scalearch.enableJavaAst` | `true` | Enable Java AST rules (tree-sitter-java) |
| `scalearch.pythonPath` | `""` | Custom Python executable path (auto-detected if empty) |
| `scalearch.maxMethodsPerClass` | `10` | SRP: max methods before warning |
| `scalearch.maxFunctionLines` | `20` | Max lines per JS/TS function |
| `scalearch.maxCyclomaticComplexity` | `5` | Max cyclomatic complexity |
| `scalearch.maxParams` | `4` | Max function parameters |
| `scalearch.maxPythonFunctionLines` | `30` | Max lines per Python function |
| `scalearch.maxPythonClassMethods` | `10` | Max methods per Python class |
| `scalearch.maxPythonInitAssignments` | `8` | Max `self.x =` assignments in `__init__` |
| `scalearch.maxJavaMethodLines` | `40` | Max lines per Java method |
| `scalearch.maxJavaClassMethods` | `10` | Max methods per Java class |
| `scalearch.maxJavaParams` | `4` | Max parameters per Java method/constructor |
| `scalearch.maxJavaClassFields` | `8` | Max fields per Java class |

---

## Contributing

Fork the repo, add your rules to `customRules.ts`, and open a PR.

### Checklist for a new rule PR

- [ ] Rule added to the correct section in `customRules.ts`
- [ ] Test case added to the relevant test file in `testfiles/`
- [ ] Rule added to the rules reference table in this README
- [ ] Setting added to `package.json` if the rule has a configurable threshold
- [ ] CHANGELOG.md updated

---

## Using ScaleArch as a Company-Wide Coding Standard

ScaleArch is designed to be **forked and customised per team or company.**  
Your engineering team defines what "bad code" means for your codebase — ScaleArch enforces it automatically in every developer's editor, from day one.

### The workflow

```
Your company forks ScaleArch
   └── Engineering lead adds company rules to customRules.ts
         ├── "Never use our deprecated PaymentV1 API"
         ├── "All DB queries must go through our QueryBuilder class"
         ├── "No raw fetch() calls — use our internal HttpClient"
         └── "Every async function must have a try/catch"
   └── Repo is shared internally
   └── Developers install the extension (F5 or vsce package)
   └── Rules fire live in every developer's editor as they write code
```

### Real-world rule examples

```typescript
// Prevent direct fetch() — company uses internal HttpClient wrapper
{
  id: 'company/no-raw-fetch',
  category: 'code-quality',
  severity: vscode.DiagnosticSeverity.Error,
  message: 'Direct fetch() is not allowed — use HttpClient from @company/core',
  hint: 'Our HttpClient handles auth tokens, retries, and error logging.',
  test: (line) => /\bfetch\s*\(/.test(line),
},
```

```typescript
// Java: flag usage of deprecated internal API
(node, _cfg, makeDiag) => {
  if (node.type !== 'method_invocation') return null;
  const obj = node.childForFieldName('object')?.text;
  if (obj !== 'PaymentV1') return null;
  return makeDiag(
    node,
    'PaymentV1 is deprecated — migrate to PaymentV2',
    vscode.DiagnosticSeverity.Error,
    'company/no-payment-v1',
    'See migration guide: confluence.company.com/payment-v2'
  );
},
```

---

## Roadmap

| Version | What | Status |
|---|---|---|
| v0.1.0 | JS/TS regex + AST engine | ✅ Done |
| v1.0.0 | Python, Java, C++ regex rules | ✅ Done |
| v1.2.0 | Python AST engine + AstGateway architecture | ✅ Done |
| v2.0.0 | Java AST engine (tree-sitter-java) — 13 rules | ✅ Done |
| v3.0.0 | C/C++ AST engine (tree-sitter-cpp) | 🔲 Planned |

---

*Built with [@typescript-eslint/typescript-estree](https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/typescript-estree) for JS/TS AST parsing, Python's built-in `ast` module for Python analysis, and [tree-sitter-java](https://github.com/tree-sitter/tree-sitter-java) for Java AST parsing.*