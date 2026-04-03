import * as vscode from 'vscode';
import { RegexRule, RuleResult } from './types';
import { PythonRuleCheck } from './pythonAstRules';

// ═══════════════════════════════════════════════════════════════════
//
//   ScaleArch — Custom Rules
//
//   This is YOUR file. Add rules here without touching any core files.
//
//   Four sections:
//     1. CUSTOM_REGEX_RULES       — line-by-line pattern matching (all languages)
//     2. CUSTOM_AST_CHECKS        — JS/TS structure-aware checks
//     3. customWholeAstChecks()   — JS/TS whole-file analysis
//     4. CUSTOM_PYTHON_AST_RULES  — Python structure-aware checks
//
//   The engines pick these up automatically. No other file to edit.
//
// ═══════════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────────
//  SECTION 1 — Custom Regex Rules
//
//  Each rule needs:
//    id       → 'category/rule-name'  (unique, kebab-case)
//    category → 'database' | 'performance' | 'solid' | 'code-quality' | 'security'
//    severity → Error / Warning / Information / Hint
//    message  → shown in the squiggly line tooltip
//    hint     → longer explanation (shown on hover)
//    test     → (line, allLines, lineIndex) => boolean
//
//  Return true  → flag this line
//  Return false → skip
// ───────────────────────────────────────────────────────────────────

export const CUSTOM_REGEX_RULES: RegexRule[] = [

  // ── Example: detect setTimeout with 0ms delay ──────────────────
  // Remove or replace this with your own rules
  {
    id: 'custom/settimeout-zero',
    category: 'performance',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'setTimeout(fn, 0) is unreliable — use queueMicrotask() or setImmediate()',
    hint: 'setTimeout with 0ms delay is not guaranteed to run immediately and carries scheduling overhead. Use queueMicrotask() for microtask-level scheduling or setImmediate() for I/O-bound deferral.',
    test: (line) => /setTimeout\s*\(.*,\s*0\s*\)/.test(line),
  },

  // ── Add your regex rules below this line ───────────────────────
  //
  // {
  //   id: 'custom/your-rule-id',
  //   category: 'code-quality',
  //   severity: vscode.DiagnosticSeverity.Warning,
  //   message: 'Your message here',
  //   hint: 'Your longer explanation here.',
  //   test: (line, allLines, lineIndex) => {
  //     return /your-pattern/.test(line);
  //   },
  // },

];


// ───────────────────────────────────────────────────────────────────
//  SECTION 2 — Custom AST (per-node) Rules
//
//  Each check is a function:
//    - receives one AST node at a time
//    - return null   → node looks fine, skip
//    - return result → flag this node
//
//  Useful node types:
//    FunctionDeclaration / FunctionExpression / ArrowFunctionExpression
//    ClassDeclaration / ClassExpression
//    MethodDefinition  (a method inside a class)
//    BlockStatement    (any { } block)
//    IfStatement / ForStatement / WhileStatement
//    CallExpression    (any function call)
//    NewExpression     (new Foo())
//    Literal           (string, number, boolean value)
//    CatchClause       (catch block in try/catch)
//
//  Tip: paste your code into https://astexplorer.net
//       (parser: @typescript-eslint/parser) to see exact node shapes.
// ───────────────────────────────────────────────────────────────────

// Helper — builds a vscode.Range from a node's location info
function makeRange(node: any): vscode.Range {
  const s = node.loc?.start ?? { line: 0, column: 0 };
  const e = node.loc?.end ?? { line: 0, column: 0 };
  return new vscode.Range(s.line - 1, s.column, e.line - 1, e.column);
}

// ── Example: flag empty catch blocks ───────────────────────────────
// Remove or replace this with your own rules
function checkEmptyCatch(node: any): RuleResult | null {
  if (node.type !== 'CatchClause') return null;

  const statements = node.body?.body ?? [];
  if (statements.length > 0) return null;

  return {
    range: makeRange(node),
    code: 'custom/empty-catch',
    message: 'Empty catch block — error is being silently swallowed',
    hint: 'Silent catch blocks hide bugs and make debugging very hard. At minimum log the error: catch (e) { console.error(e); }',
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ── Example: flag boolean parameters (primitive obsession) ─────────
function checkBooleanParam(node: any): RuleResult | null {
  const fnTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
  if (!fnTypes.includes(node.type)) return null;

  const boolParams = (node.params ?? []).filter(
    (p: any) =>
      p.type === 'AssignmentPattern' &&
      (p.right?.value === true || p.right?.value === false)
  );

  if (boolParams.length === 0) return null;

  return {
    range: makeRange(node),
    code: 'custom/boolean-param',
    message: 'Boolean parameter detected — consider using an options object or separate functions',
    hint: 'Boolean parameters often mean a function does two things. Replace with an options object or split into two named functions: processUser(user) and processAdminUser(user).',
    severity: vscode.DiagnosticSeverity.Information,
  };
}

// ── Add your per-node check functions above this line ──────────────
// then export them in the array below

export const CUSTOM_AST_CHECKS: Array<(node: any) => RuleResult | null> = [
  checkEmptyCatch,
  checkBooleanParam,
  // add your functions here ↓
];


// ───────────────────────────────────────────────────────────────────
//  SECTION 3 — Custom Whole-AST Rules
//
//  Use when you need to look at the entire file at once.
//  Example use cases:
//    - count total imports in a file
//    - find all usages of a specific pattern across the file
//    - detect repeated function names
//
//  Return RuleResult[] (can be empty).
// ───────────────────────────────────────────────────────────────────

// Helper — collect all nodes of given types from the AST
function getAllNodes(node: any, types: string[]): any[] {
  const results: any[] = [];
  function walk(n: any) {
    if (!n || typeof n !== 'object') return;
    if (types.includes(n.type)) results.push(n);
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      const child = n[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  }
  walk(node);
  return results;
}

// ── Example: warn when a file has too many imports ─────────────────
function checkTooManyImports(ast: any): RuleResult[] {
  const imports = getAllNodes(ast, ['ImportDeclaration']);
  const THRESHOLD = 15;
  if (imports.length <= THRESHOLD) return [];

  return [{
    range: makeRange(imports[0]),
    code: 'custom/too-many-imports',
    message: `${imports.length} imports — this file may be doing too much`,
    hint: `Files with many imports often violate Single Responsibility. Consider splitting into smaller focused modules.`,
    severity: vscode.DiagnosticSeverity.Information,
  }];
}

// ── Add your whole-AST check functions above then call them below ───

export function customWholeAstChecks(ast: any): RuleResult[] {
  return [
    ...checkTooManyImports(ast),
    // ...yourWholeAstRule(ast),  ← add more here
  ];
}

// ───────────────────────────────────────────────────────────────────
//  SECTION 4 — Custom Python AST Rules
//
//  Each check is a function with this signature:
//    (node, cfg, makeDiag) => vscode.Diagnostic | null
//
//  node     — current Python AST node (_type, lineno, col_offset etc.)
//  cfg      — VS Code workspace config (read thresholds from here)
//  makeDiag — helper to create a Diagnostic at the node's location
//
//  Return null  → node is fine, skip
//  Return Diag  → flag this node with a squiggly line
//
//  Useful Python node types (_type field):
//    FunctionDef / AsyncFunctionDef  — function definitions
//    ClassDef                        — class definitions
//    Assign                          — x = value
//    Return                          — return statement
//    Import / ImportFrom             — import statements
//    ExceptHandler                   — except block in try/except
//    Call                            — any function call
//
//  Tip: run  python3 -c "import ast; print(ast.dump(ast.parse('your code')))"
//       to see exact node shapes for your Python code.
// ───────────────────────────────────────────────────────────────────

// ── Example: flag functions that use bare string concatenation ─────
// instead of f-strings or .format() (Python 3.6+ best practice)
// Remove or replace with your own rules
function checkPyStringConcat(
  node: any,
  _cfg: any,
  makeDiag: any
): vscode.Diagnostic | null {
  // Look for BinOp with Add operator where either operand is a string Constant
  if (node._type !== 'BinOp') return null;
  if (node.op?._type !== 'Add') return null;

  const leftIsStr  = node.left?._type  === 'Constant' && typeof node.left?.value  === 'string';
  const rightIsStr = node.right?._type === 'Constant' && typeof node.right?.value === 'string';

  if (!leftIsStr && !rightIsStr) return null;

  return makeDiag(
    node,
    'String concatenation with + — prefer f-strings for readability',
    vscode.DiagnosticSeverity.Hint,
    'custom/py-string-concat'
  );
}

// ── Add your Python AST check functions above this line ────────────
// then export them in the array below

export const CUSTOM_PYTHON_AST_RULES: PythonRuleCheck[] = [
  checkPyStringConcat,
  // add your functions here ↓
];