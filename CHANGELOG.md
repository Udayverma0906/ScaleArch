# Change Log
All notable changes to the "scalearch" extension will be documented in this file.
Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

---

## [2.0.5] — Publishing Fixes Complete — All Engines Working

### Fixed
- Moved `require('@typescript-eslint/typescript-estree')` from inside `analyze()` to module level — silent `catch {}` was masking load failures on every file open
- Added `OutputChannel` logging to `JsTsAstEngine` — JS/TS AST errors now visible in Output → ScaleArch (JS/TS)
- JS/TS AST rules now reliably fire in the published extension

---

## [2.0.4] — Webpack Bundling Fix for JS/TS AST

### Fixed
- Removed `@typescript-eslint/typescript-estree` and `typescript` from webpack `externals` — they are now bundled directly into `dist/extension.js`
- Previously these were marked external which worked in F5 (dev) but failed silently in the published extension because VS Code's Node.js process does not expose them
- `extension.js` grew from 53KB → 9.58MB — expected, this is the correct size with typescript-eslint bundled

---

## [2.0.3] — Include @typescript-eslint in vsix

### Fixed
- Added `!node_modules/@typescript-eslint/**` and `!node_modules/typescript/**` to `.vscodeignore` — JS/TS AST rules were failing silently because the published extension had no access to these modules

---

## [2.0.2] — Include node-gyp-build in vsix

### Fixed
- Added `!node_modules/node-gyp-build/**` to `.vscodeignore`
- `node-gyp-build` is a runtime dependency of `tree-sitter` — missing it caused `Cannot find module 'node-gyp-build'` on activation

---

## [2.0.1] — Fix tree-sitter not found in published extension

### Fixed
- Added `!node_modules/tree-sitter/**` and `!node_modules/tree-sitter-java/**` to `.vscodeignore`
- Default `.vscodeignore` excluded all of `node_modules/**` — tree-sitter native `.node` binaries were not shipped in the vsix
- Extension size corrected from 885KB → 8.16MB (includes Win/Mac/Linux tree-sitter binaries)

> **Root cause explained:** tree-sitter is a native module (compiled C++ `.node` binary). Webpack cannot bundle native binaries — they must be marked as `external` in `webpack.config.js` AND shipped in `node_modules` via `.vscodeignore` exceptions. The default ignore file excluded them. This is not documented clearly by VS Code or tree-sitter.

---

## [2.0.0] — Java AST Engine

### Added

- **Java AST engine** — structure-aware analysis for Java files using `tree-sitter-java`
  - Native Node.js binding — no child process, no JDK required, synchronous parsing
  - Works on all platforms — Windows, macOS, Linux binaries included
  - Falls back gracefully — regex rules still fire if Java AST is disabled
  - Toggle via `scalearch.enableJavaAst` setting

- **13 Java AST rules** in `javaAstRules.ts`

  **Code Quality**
  - `java/ast-method-too-long` — method body exceeds `maxJavaMethodLines` (default 40)
  - `java/ast-class-too-many-methods` — class has more than `maxJavaClassMethods` methods (default 10)
  - `java/ast-too-many-params` — method has more than `maxJavaParams` parameters (default 4)
  - `java/ast-constructor-too-many-params` — constructor has too many parameters — use Builder pattern
  - `java/ast-empty-catch` — empty catch block silently swallows exceptions
  - `java/ast-deep-nesting` — nesting depth exceeds threshold (default 3)
  - `java/ast-too-many-fields` — class has more than `maxJavaClassFields` fields (default 8) — God Object
  - `java/ast-magic-number` — hardcoded numeric literal — extract to named constant

  **Design / SOLID**
  - `java/ast-interface-too-large` — interface has more than 5 methods — ISP violation
  - `java/ast-public-field` — public non-final field breaks encapsulation

  **Reliability**
  - `java/ast-system-exit` — `System.exit()` outside `main()` kills the entire JVM
  - `java/ast-thread-sleep` — `Thread.sleep()` — use `ScheduledExecutorService` instead
  - `java/ast-string-equals-compare` — string compared with `==` or `!=` — use `.equals()`

- **Custom Java AST rules** — Section 5 added to `customRules.ts`
  - `CUSTOM_JAVA_AST_RULES: JavaRuleCheck[]` — add Java AST rules without touching core files
  - Same pattern as `CUSTOM_PYTHON_AST_RULES` in Section 4

- **New VS Code settings**
  - `scalearch.enableJavaAst` — toggle Java AST analysis (default true)
  - `scalearch.maxJavaMethodLines` — threshold for method-too-long (default 40)
  - `scalearch.maxJavaClassMethods` — threshold for class-too-many-methods (default 10)
  - `scalearch.maxJavaParams` — threshold for too-many-params (default 4)
  - `scalearch.maxJavaClassFields` — threshold for too-many-fields (default 8)

- **New types** in `types.ts`
  - `JavaNode` interface — tree-sitter node shape (type, startPosition, endPosition, namedChildren, childForFieldName)
  - `JavaRuleCheck` type — includes `hint?` as 5th parameter from day one

---

## [1.2.2] — Fixed Standard Regex Rules

### Fixed
- `db/select` rules were triggering on plain English sentences. Will now only trigger for SQL queries.
- Hints were not showing up for all rules.

---

## [1.2.0] — Python AST Engine

### Added
- **Python AST engine** — structure-aware analysis for Python files using Python's built-in `ast` module
  - Zero bundle cost — no native bindings, no extra dependencies
  - Requires Python 3.8+ installed on the machine (auto-detected)
  - Falls back gracefully — regex rules still fire if Python is not found
- **5 Python AST rules**
  - `py/ast-function-too-long` — function body exceeds `maxPythonFunctionLines` (default 30)
  - `py/ast-class-too-many-methods` — class has more than `maxPythonClassMethods` methods (default 10)
  - `py/ast-missing-docstring` — public function or class has no docstring
  - `py/ast-no-type-hints` — function has no parameter or return type annotations
  - `py/ast-init-too-complex` — `__init__` assigns more than `maxPythonInitAssignments` instance variables (default 8)
- **AstGateway architecture** — single entry point for all AST analysis, routes by language ID
  - `IAstEngine` interface — every language engine implements this contract
  - `JsTsAstEngine` — existing JS/TS engine, now implements IAstEngine
  - `PythonAstEngine` — new Python engine
  - Adding Java or C++ AST is now one new file + one line in the gateway
- **Custom Python AST rules** — Section 4 added to `customRules.ts`
  - `CUSTOM_PYTHON_AST_RULES: PythonRuleCheck[]` — add Python AST rules without touching core files

### Fixed
- `child_process` added to webpack externals — `spawnSync` now works correctly in the bundled extension
- Python stdin forced to UTF-8 on Windows — prevents `UnicodeDecodeError` on files with non-ASCII characters

---

## [1.0.0] — Multi-language Regex Engine

### Added
- **Python support** — 9 regex rules covering performance, code quality, and security
- **Java support** — 8 regex rules
- **C/C++ support** — 10 regex rules
- **6 new universal rules** — subquery-in-clause, delete/update-without-where, await-in-loop, hardcoded-ip, console-log-sensitive

### Fixed
- C/C++ `#define` rules were silently skipped — regex engine treated `#` as a comment character
- `java/string-concat-in-loop` never fired — pattern only matched string literals after `+=`

---

## [0.1.0] — Initial Release

### Added
- **Regex engine** — line-by-line pattern matching for TypeScript and JavaScript
  - 8 database rules, 5 performance rules, 4 security rules
- **AST engine** — structure-aware analysis for TypeScript and JavaScript
  - `solid/srp`, `solid/dip`, `quality/function-too-long`, `quality/high-complexity`
  - `quality/deep-nesting`, `quality/too-many-params`, `quality/duplicate-string`
- **Custom rules support** via `src/rules/customRules.ts`
- **VS Code settings** for all rule groups and thresholds
- Keyboard shortcut `Ctrl+Shift+A` / `Cmd+Shift+A`
- Auto-analysis 600ms after you stop typing