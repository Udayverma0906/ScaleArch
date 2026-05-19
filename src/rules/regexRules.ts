/* eslint-disable curly */
import { RegexRule } from './types';
import * as vscode from 'vscode';

// ─────────────────────────────────────────────
//  DATABASE RULES  (all languages — SQL appears in any file)
// ─────────────────────────────────────────────
export const DB_RULES: RegexRule[] = [
  {
    id: 'db/no-select-star',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Avoid SELECT * — fetch only the columns you need',
    hint: 'SELECT * fetches all columns including unused ones, wastes network bandwidth and prevents index-only scans.',
    test: (line) =>
      /select\s+\*/i.test(line) &&
      !/^\s*(\/\/|#|\*)/.test(line),
  },
  {
    id: 'db/no-where-clause',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'SELECT without WHERE — possible full table scan',
    hint: 'Without a WHERE clause every row is scanned. Add a filter or ensure this is intentional.',
    test: (line) =>
      /select\s+[\w\s,*]+from\s+\w+\s*[`;]/i.test(line) &&
      !/where/i.test(line) &&
      !/count\s*\(/i.test(line),
  },
  {
    id: 'db/no-limit',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'No LIMIT clause — risk of fetching a huge result set',
    hint: 'Always paginate results. Add LIMIT (and OFFSET) to control how many rows are returned.',
    test: (line) => {
      // Must look like SQL SELECT — in a string literal or followed by column/wildcard syntax
      const isSqlSelect = /(['`"])\s*SELECT\b/i.test(line) ||
                          /\bSELECT\s+(\*|\w+\s*,|\w+\s+FROM\b)/i.test(line);
      if (!isSqlSelect) return false;
      return !/\bLIMIT\b/i.test(line) &&
             !/count\s*\(/i.test(line) &&
             !/insert|update|delete/i.test(line);
    },
  },
  {
    id: 'db/leading-wildcard-like',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Leading wildcard LIKE '%...' disables index usage",
    hint: "A leading % forces a full table scan. Consider full-text search (FULLTEXT INDEX) or a search engine like Elasticsearch.",
    test: (line) => /like\s+['"`]%/i.test(line),
  },
  {
    id: 'db/query-in-loop',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'SQL query inside a loop — classic N+1 problem',
    hint: 'Each iteration fires a separate DB round-trip. Use a JOIN, batch query (WHERE id IN (...)), or a dataloader instead.',
    test: (line, allLines, idx) => {
  // Must look like SQL SELECT, not plain English
  const isSqlSelect = /(['"`])\s*SELECT\b/i.test(line) ||
                      /\bSELECT\s+(\*|\w+\s*,|\w+\s+FROM\b)/i.test(line);
  if (!isSqlSelect) return false;
  for (let i = Math.max(0, idx - 5); i < idx; i++) {
    if (/\b(for|while|forEach|map|reduce|filter|flatMap)\b/.test(allLines[i])) return true;
  }
  return false;
    },
  },
  {
    id: 'db/subquery-in-clause',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Subquery inside IN() — consider EXISTS or a JOIN instead',
    hint: 'IN (SELECT ...) is often slower than EXISTS() or a JOIN, especially on large datasets.',
    test: (line) => /\bIN\s*\(\s*SELECT\b/i.test(line),
  },
  {
    id: 'db/delete-without-where',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'DELETE without WHERE — this will wipe the entire table',
    hint: 'A DELETE without a WHERE clause deletes every row. Always add a WHERE clause unless you explicitly want to truncate.',
    test: (line) =>
      /\bDELETE\s+FROM\s+\w+/i.test(line) &&
      !/\bWHERE\b/i.test(line),
  },
  {
    id: 'db/update-without-where',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'UPDATE without WHERE — will update every row in the table',
    hint: 'A WHERE clause is almost always required on UPDATE. Double-check this is intentional.',
    test: (line) =>
      /\bUPDATE\s+\w+\s+SET\b/i.test(line) &&
      !/\bWHERE\b/i.test(line),
  },
];

// ─────────────────────────────────────────────
//  PERFORMANCE RULES  (JS / TS only)
// ─────────────────────────────────────────────
const JS_TS = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];

export const PERF_RULES: RegexRule[] = [
  {
    id: 'perf/json-parse-in-loop',
    category: 'performance',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'JSON.parse() inside a loop — expensive repeated parsing',
    hint: 'Parse once outside the loop and reuse the result.',
    test: (line, allLines, idx) => {
      if (!/JSON\.parse\s*\(/.test(line)) return false;
      for (let i = Math.max(0, idx - 5); i < idx; i++) {
        if (/\b(for|while|forEach|map)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },
  {
    id: 'perf/console-log-production',
    category: 'performance',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Information,
    message: 'console.log() left in code — remove before production',
    hint: 'Use a proper logger (winston, pino) that can be disabled in production.',
    test: (line) =>
      /console\.(log|warn|error|info)\s*\(/.test(line) &&
      !/\/\/.*console/.test(line),
  },
  {
    id: 'perf/sync-fs-call',
    category: 'performance',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Synchronous fs call blocks the event loop',
    hint: 'Use the async version: readFileSync → readFile, writeFileSync → writeFile.',
    test: (line) =>
      /\bfs\.(readFileSync|writeFileSync|existsSync|readdirSync|mkdirSync)\b/.test(line),
  },
  {
    id: 'perf/new-object-in-loop',
    category: 'performance',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Object/array created inside a loop — GC pressure',
    hint: 'Allocate outside the loop and reuse or clear per iteration to reduce garbage collection overhead.',
test: (line, allLines, idx) => {
  if (!/(new\s+\w+\s*\(|\[\s*\]|\{\s*\})/.test(line)) return false;

  const getIndent = (s: string) => s.match(/^(\s*)/)?.[1]?.length ?? 0;
  const currentIndent = getIndent(line);

  for (let i = idx - 1; i >= Math.max(0, idx - 8); i--) {
    const prevLine = allLines[i];
    const prevIndent = getIndent(prevLine);

    if (prevIndent < currentIndent && /\b(for|while|forEach|map|filter|reduce)\b/.test(prevLine)) {
      return true;
    }
    if (prevIndent <= currentIndent && /^\s*\}/.test(prevLine)) {
      return false;
    }
  }
  return false;
},
  },
  {
    id: 'perf/await-in-loop',
    category: 'performance',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'await inside a loop runs promises serially — use Promise.all()',
    hint: 'Each await blocks the next iteration. Collect promises into an array and resolve with Promise.all([...]) for parallel execution.',
    test: (line, allLines, idx) => {
      if (!/\bawait\b/.test(line)) return false;
      for (let i = Math.max(0, idx - 5); i < idx; i++) {
        if (/\b(for|while|forEach|map)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },
];

// ─────────────────────────────────────────────
//  SECURITY RULES  (all languages)
// ─────────────────────────────────────────────
export const SECURITY_RULES: RegexRule[] = [
  {
    id: 'security/hardcoded-secret',
    category: 'security',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Possible hardcoded secret detected',
    hint: 'Move secrets to environment variables or a secrets manager (AWS SSM, HashiCorp Vault).',
    test: (line) =>
      /(password|secret|api_key|apikey|token|auth)\s*[:=]\s*['"`][^'"`]{6,}/i.test(line) &&
      !/process\.env/.test(line),
  },
  {
    id: 'security/eval-usage',
    category: 'security',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Error,
    message: 'eval() is a security risk — avoid it',
    hint: 'eval() executes arbitrary code and can be exploited. Use JSON.parse() for data, or restructure the logic.',
    test: (line) => /\beval\s*\(/.test(line),
  },
  {
    id: 'security/hardcoded-ip',
    category: 'security',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Hardcoded IP address detected',
    hint: 'Hardcoded IPs make deployments fragile and may expose internal infrastructure. Use environment variables or service discovery.',
    test: (line) => {
      if (/^\s*(\/\/|#|\*)/.test(line)) return false;
      if (/\bv?\d+\.\d+\.\d+\.\d+\b|(version|ver)\s*[:\s][\d.]/i.test(line)) return false;
      if (/255\.255\.255\.255|0\.0\.0\.0/.test(line)) return false;
      return /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(line);
    },
  },
  {
    id: 'security/console-log-sensitive',
    category: 'security',
    languages: JS_TS,
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Logging potentially sensitive data',
    hint: 'Logging secrets or credentials can expose them in log aggregators. Redact sensitive fields before logging.',
    test: (line) =>
      /console\.(log|warn|info|debug)\s*\(.*\b(password|secret|token|apikey|api_key|auth|credential|private_key)\b/i.test(line) &&
      !/\/\/.*console/.test(line),
  },
];

// ═════════════════════════════════════════════
//  PYTHON RULES
// ═════════════════════════════════════════════
export const PYTHON_RULES: RegexRule[] = [

  // ── Performance ──
  {
    id: 'py/print-in-production',
    category: 'performance',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Information,
    message: 'print() left in code — use the logging module instead',
    hint: 'print() has no log levels and cannot be silenced in production. Use logging.debug(), logging.info() etc. so output can be filtered per environment.',
    test: (line) =>
      /^\s*print\s*\(/.test(line) &&
      !/^\s*#/.test(line),
  },
  {
    id: 'py/new-object-in-loop',
    category: 'performance',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Object allocated inside a loop — consider moving outside',
    hint: 'Creating new lists/dicts/objects on every iteration adds GC pressure. Allocate once before the loop and reset per iteration where possible.',
    test: (line, allLines, idx) => {
      if (!/=\s*\[\s*\]|=\s*\{\s*\}|=\s*\(\s*\)/.test(line)) return false;
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        if (/^\s*(for|while)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },

  // ── Code quality ──
  {
    id: 'py/bare-except',
    category: 'code-quality',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Bare except: catches everything including KeyboardInterrupt and SystemExit',
    hint: 'Specify the exception type: except ValueError: or except (TypeError, ValueError):. Bare except: swallows errors silently and makes debugging very hard.',
    test: (line) => /^\s*except\s*:/.test(line),
  },
  {
    id: 'py/mutable-default-arg',
    category: 'code-quality',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Mutable default argument — shared across all calls',
    hint: 'Default arguments are evaluated once at function definition time. Use None and assign inside the body: def fn(items=None): items = items or []',
    test: (line) =>
      /def\s+\w+\s*\(.*=\s*(\[\s*\]|\{\s*\}|\(\s*\))/.test(line),
  },
  {
    id: 'py/broad-exception-catch',
    category: 'code-quality',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Catching broad Exception — use a more specific type',
    hint: 'Catching Exception masks unexpected errors. Catch only the specific exceptions you can handle (e.g. ValueError, IOError).',
    test: (line) => /^\s*except\s+Exception\s*(:|\s+as\s)/.test(line),
  },
  {
    id: 'py/assert-in-production',
    category: 'code-quality',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'assert is disabled when Python runs with -O (optimise flag)',
    hint: 'assert is stripped in optimised builds (python -O). Use explicit if/raise for runtime validation that must hold in production.',
    test: (line) =>
      /^\s*assert\s+/.test(line) &&
      !/^\s*#/.test(line),
  },

  // ── Security ──
  {
    id: 'py/eval-usage',
    category: 'security',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'eval() is a security risk — avoid it',
    hint: 'eval() executes arbitrary Python code. Use ast.literal_eval() for safe data parsing, or restructure the logic entirely.',
    test: (line) =>
      /\beval\s*\(/.test(line) &&
      !/^\s*#/.test(line),
  },
  {
    id: 'py/exec-usage',
    category: 'security',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'exec() executes arbitrary code — security risk',
    hint: 'exec() is rarely justified and hard to audit. Use a dict of callables for dynamic dispatch instead.',
    test: (line) =>
      /\bexec\s*\(/.test(line) &&
      !/^\s*#/.test(line),
  },
  {
    id: 'py/shell-true',
    category: 'security',
    languages: ['python'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'shell=True in subprocess is a command-injection risk',
    hint: 'shell=True passes the command through the shell, enabling injection if any part of the command comes from user input. Pass a list instead: subprocess.run(["cmd", "arg"])',
    test: (line) =>
      /\bsubprocess\b.*\bshell\s*=\s*True/.test(line),
  },
];

// ═════════════════════════════════════════════
//  JAVA RULES
// ═════════════════════════════════════════════
export const JAVA_RULES: RegexRule[] = [

  // ── Performance ──
  {
    id: 'java/system-out-println',
    category: 'performance',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Information,
    message: 'System.out.println() left in code — use a logger instead',
    hint: 'System.out.println is synchronous and has no log levels. Use SLF4J or Log4j2: logger.debug(), logger.info() etc.',
    test: (line) =>
      /System\s*\.\s*out\s*\.\s*print(ln)?\s*\(/.test(line) &&
      !/\/\/.*System\.out/.test(line),
  },
  {
    id: 'java/string-concat-in-loop',
    category: 'performance',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'String concatenation with + inside a loop — use StringBuilder',
    hint: 'Each + on a String creates a new object. Use StringBuilder.append() inside loops and call toString() once at the end.',
    test: (line, allLines, idx) => {
      // Match: variable += anything  OR  String type declaration with +
      if (!/^\s*\w+\s*\+=|String\b.*\+\s*\w+/.test(line)) return false;
      for (let i = Math.max(0, idx - 5); i < idx; i++) {
        if (/\b(for|while)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },
  {
    id: 'java/new-object-in-loop',
    category: 'performance',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Object instantiation inside a loop — move outside if reusable',
    hint: 'Creating objects in tight loops increases GC pressure. Move the allocation before the loop and reset/reuse per iteration where possible.',
    test: (line, allLines, idx) => {
      if (!/=\s*new\s+\w+/.test(line)) return false;
      for (let i = Math.max(0, idx - 5); i < idx; i++) {
        if (/\b(for|while)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },

  // ── Code quality ──
  {
    id: 'java/empty-catch',
    category: 'code-quality',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Empty catch block — exception is silently swallowed',
    hint: 'At minimum log the exception: catch (Exception e) { logger.error("Unexpected error", e); }. Silent catches hide bugs.',
    test: (line, allLines, idx) => {
      if (!/^\s*catch\s*\(/.test(line)) return false;
      for (let i = idx + 1; i < Math.min(idx + 4, allLines.length); i++) {
        const next = allLines[i].trim();
        if (next === '') continue;
        return next === '}';
      }
      return false;
    },
  },
  {
    id: 'java/catch-generic-exception',
    category: 'code-quality',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Catching generic Exception — use a more specific type',
    hint: 'Catching Exception masks unexpected errors. Catch only the specific exceptions you expect (e.g. IOException, SQLException).',
    test: (line) => /catch\s*\(\s*Exception\s+\w+\s*\)/.test(line),
  },
  {
    id: 'java/raw-types',
    category: 'code-quality',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Raw type used — add a generic type parameter',
    hint: 'Raw types (List, Map, Set without <T>) bypass compile-time type checking. Use List<String>, Map<String, Integer> etc.',
    test: (line) =>
      /\b(List|Map|Set|ArrayList|HashMap|HashSet)\s+\w+\s*=/.test(line) &&
      !/\b(List|Map|Set|ArrayList|HashMap|HashSet)\s*</.test(line),
  },

  // ── Security ──
  {
    id: 'java/hardcoded-secret',
    category: 'security',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Possible hardcoded secret in Java code',
    hint: 'Move secrets to environment variables, application.properties (with encryption), or a secrets manager like AWS SSM or HashiCorp Vault.',
    test: (line) =>
      /(password|secret|apiKey|api_key|token|auth)\s*=\s*"[^"]{6,}"/i.test(line) &&
      !/\/\/.*password/.test(line),
  },
  {
    id: 'java/sql-concatenation',
    category: 'security',
    languages: ['java'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'SQL built with string concatenation — SQL injection risk',
    hint: 'Use PreparedStatement with ? placeholders instead of concatenating user input into SQL strings.',
    test: (line) =>
      /(SELECT|INSERT|UPDATE|DELETE).*"\s*\+/.test(line) ||
      /\+\s*\w+\s*\+.*"(WHERE|AND|OR|VALUES)/.test(line),
  },
];

// ═════════════════════════════════════════════
//  C / C++ RULES
// ═════════════════════════════════════════════
export const CPP_RULES: RegexRule[] = [

  // ── Performance ──
  {
    id: 'cpp/cout-in-production',
    category: 'performance',
    languages: ['cpp', 'c'],
    severity: vscode.DiagnosticSeverity.Information,
    message: 'std::cout left in code — use a proper logging framework',
    hint: "std::cout is synchronous and not thread-safe for production use. Use spdlog, glog, or your project's logging framework.",
    test: (line) =>
      /\bstd\s*::\s*cout\b|\bcout\s*<</.test(line) &&
      !/^\s*\/\//.test(line),
  },
  {
    id: 'cpp/printf-in-production',
    category: 'performance',
    languages: ['cpp', 'c'],
    severity: vscode.DiagnosticSeverity.Information,
    message: 'printf() left in code — use a proper logging framework',
    hint: "printf() has no log levels and cannot be filtered in production. Use your project's logging framework.",
    test: (line) =>
      /\bprintf\s*\(/.test(line) &&
      !/^\s*\/\//.test(line),
  },

  // ── Code quality ──
  {
    id: 'cpp/raw-new-without-delete',
    category: 'code-quality',
    languages: ['cpp'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Raw new — prefer smart pointers (unique_ptr / shared_ptr)',
    hint: 'Manual new/delete is error-prone and causes memory leaks. Use std::make_unique<T>() or std::make_shared<T>() instead.',
    test: (line) =>
      /=\s*new\s+\w+/.test(line) &&
      !/^\s*\/\//.test(line) &&
      !/make_unique|make_shared/.test(line),
  },
  {
    id: 'cpp/raw-delete',
    category: 'code-quality',
    languages: ['cpp'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Raw delete — prefer smart pointers to manage object lifetime',
    hint: 'Manual delete is error-prone (double-free, use-after-free). Let std::unique_ptr or std::shared_ptr handle lifetime via RAII.',
    test: (line) =>
      /^\s*delete\s+/.test(line) &&
      !/^\s*\/\//.test(line),
  },
  {
    id: 'cpp/define-instead-of-const',
    category: 'code-quality',
    languages: ['cpp', 'c'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: '#define used for a constant — use const or constexpr instead',
    hint: '#define has no type safety and no scope. Prefer: constexpr int MAX_SIZE = 100; or const std::string NAME = "value";',
    test: (line) =>
      /^\s*#\s*define\s+[A-Z_]+\s+\d+/.test(line) ||
      /^\s*#\s*define\s+[A-Z_]+\s+"/.test(line),
  },
  {
    id: 'cpp/using-namespace-std',
    category: 'code-quality',
    languages: ['cpp'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: '"using namespace std" pollutes the global namespace',
    hint: 'In header files this forces the namespace onto every file that includes yours. Use explicit prefixes (std::vector) or targeted declarations (using std::cout).',
    test: (line) =>
      /^\s*using\s+namespace\s+std\s*;/.test(line) &&
      !/^\s*\/\//.test(line),
  },
  {
    id: 'cpp/c-style-cast',
    category: 'code-quality',
    languages: ['cpp'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'C-style cast — use static_cast, dynamic_cast, or reinterpret_cast',
    hint: 'C-style casts are unchecked and can silently do the wrong thing. C++ named casts make intent explicit and are verified at compile time.',
    test: (line) =>
      /\(\s*(int|float|double|char|long|short|void\s*\*)\s*\)\s*[\w(]/.test(line) &&
      !/^\s*(\/\/|\*)/.test(line.trimStart()),
  },

  // ── Security ──
  {
    id: 'cpp/gets-usage',
    category: 'security',
    languages: ['cpp', 'c'],
    severity: vscode.DiagnosticSeverity.Error,
    message: 'gets() is dangerous — causes buffer overflow',
    hint: 'gets() has no bounds checking and was removed in C11/C++14. Use fgets(buf, sizeof(buf), stdin) instead.',
    test: (line) =>
      /\bgets\s*\(/.test(line) &&
      !/^\s*\/\//.test(line),
  },
  {
    id: 'cpp/strcpy-usage',
    category: 'security',
    languages: ['cpp', 'c'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'strcpy() has no bounds checking — use strncpy() or std::string',
    hint: 'strcpy() can overflow the destination buffer. Use strncpy(dest, src, sizeof(dest)-1) or prefer std::string in C++.',
    test: (line) =>
      /\bstrcpy\s*\(/.test(line) &&
      !/^\s*\/\//.test(line),
  },
  {
    id: 'cpp/sprintf-usage',
    category: 'security',
    languages: ['cpp', 'c'],
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'sprintf() has no bounds checking — use snprintf()',
    hint: 'sprintf() can overflow the destination buffer. Use snprintf(buf, sizeof(buf), ...) which limits the output length.',
    test: (line) =>
      /\bsprintf\s*\(/.test(line) &&
      !/^\s*\/\//.test(line) &&
      !/snprintf/.test(line),
  },
];