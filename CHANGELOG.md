# Change Log

All notable changes to the "scalearch" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.
## [1.2.1] — Python AST Engine

### Fixed
  Hints were not showing up for all rules.

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
  - Same user experience as `CUSTOM_REGEX_RULES` and `CUSTOM_AST_CHECKS`

- **New VS Code settings**
  - `scalearch.enablePythonAst` — toggle Python AST analysis on/off (default true)
  - `scalearch.pythonPath` — set custom Python executable path (default: auto-detect)
  - `scalearch.maxPythonFunctionLines` — threshold for function-too-long (default 30)
  - `scalearch.maxPythonClassMethods` — threshold for class-too-many-methods (default 10)
  - `scalearch.maxPythonInitAssignments` — threshold for init-too-complex (default 8)

### Fixed
- `child_process` added to webpack externals — `spawnSync` now works correctly in the bundled extension
- Python stdin forced to UTF-8 on Windows — prevents `UnicodeDecodeError` on files with non-ASCII characters in comments

---

## [1.0.0] — Multi-language Regex Engine

### Added
- **Python support** — 9 regex rules covering performance, code quality, and security
  - `py/print-in-production` — print() instead of logging module
  - `py/new-object-in-loop` — list/dict allocation inside loops
  - `py/bare-except` — bare except: catches KeyboardInterrupt and SystemExit
  - `py/mutable-default-arg` — mutable default arguments shared across calls
  - `py/broad-exception-catch` — catching generic Exception
  - `py/assert-in-production` — assert stripped by python -O flag
  - `py/eval-usage` — eval() security risk
  - `py/exec-usage` — exec() security risk
  - `py/shell-true` — subprocess shell=True injection risk

- **Java support** — 8 regex rules
  - `java/system-out-println` — use SLF4J or Log4j2 instead
  - `java/string-concat-in-loop` — use StringBuilder instead
  - `java/new-object-in-loop` — GC pressure from loop allocations
  - `java/empty-catch` — silently swallowed exceptions
  - `java/catch-generic-exception` — catching broad Exception type
  - `java/raw-types` — List/Map/Set without generic type parameter
  - `java/hardcoded-secret` — secrets hardcoded in string literals
  - `java/sql-concatenation` — SQL injection via string concatenation

- **C / C++ support** — 10 regex rules
  - `cpp/cout-in-production` — use spdlog or glog instead
  - `cpp/printf-in-production` — use logging framework instead
  - `cpp/raw-new-without-delete` — use smart pointers instead
  - `cpp/raw-delete` — use RAII via unique_ptr / shared_ptr
  - `cpp/define-instead-of-const` — use constexpr or const instead
  - `cpp/using-namespace-std` — pollutes the global namespace
  - `cpp/c-style-cast` — use static_cast, dynamic_cast, or reinterpret_cast
  - `cpp/gets-usage` — buffer overflow, removed in C11/C++14
  - `cpp/strcpy-usage` — no bounds checking, use strncpy or std::string
  - `cpp/sprintf-usage` — no bounds checking, use snprintf

- **6 new universal rules** added to core rule sets
  - `db/subquery-in-clause` — IN (SELECT ...) performance issue
  - `db/delete-without-where` — wipes entire table
  - `db/update-without-where` — updates every row
  - `perf/await-in-loop` — runs promises serially, use Promise.all()
  - `security/hardcoded-ip` — hardcoded IP addresses
  - `security/console-log-sensitive` — logging passwords, tokens, secrets

- **New VS Code settings** to enable/disable language-specific rule groups
  - `scalearch.enablePython`
  - `scalearch.enableJava`
  - `scalearch.enableCpp`

### Fixed
- C/C++ `#define` rules were silently skipped — regex engine treated `#` as a comment character for all languages. C/C++ preprocessor directives are now correctly processed.
- `java/string-concat-in-loop` never fired — pattern only matched string literals after `+=`, not variables. Now catches all `+=` assignments inside loops.

---

## [0.1.0] — Initial Release

### Added
- **Regex engine** — line-by-line pattern matching for TypeScript and JavaScript
  - 8 database rules — SELECT *, missing WHERE/LIMIT, N+1 queries, SQL injection patterns
  - 5 performance rules — sync fs calls, JSON.parse in loops, object allocation in loops
  - 4 security rules — hardcoded secrets, eval(), hardcoded IPs, sensitive logging

- **AST engine** — structure-aware analysis for TypeScript and JavaScript only
  - `solid/srp` — class with too many methods (configurable threshold)
  - `solid/dip` — constructor instantiating concrete dependencies
  - `quality/function-too-long` — function exceeds line threshold
  - `quality/high-complexity` — cyclomatic complexity above threshold
  - `quality/deep-nesting` — nesting depth above threshold
  - `quality/too-many-params` — function parameter count above threshold
  - `quality/duplicate-string` — same string literal repeated 4+ times

- **Custom rules support** via `src/rules/customRules.ts`
  - `CUSTOM_REGEX_RULES[]` — add regex rules without touching core files
  - `CUSTOM_AST_CHECKS[]` — add AST per-node checks
  - `customWholeAstChecks()` — add whole-file AST analysis

- **VS Code settings** for all rule groups and thresholds
  - `scalearch.enableDatabase`, `enablePerformance`, `enableSecurity`
  - `scalearch.enableSolid`, `enableCodeQuality`
  - `scalearch.maxFunctionLines`, `maxParams`, `maxMethodsPerClass`
  - `scalearch.maxCyclomaticComplexity`, `maxNestingDepth`

- Keyboard shortcut `Ctrl+Shift+A` / `Cmd+Shift+A` to run analysis manually
- Analysis runs automatically 600ms after you stop typing