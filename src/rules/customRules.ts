/* eslint-disable curly */
import * as vscode from 'vscode';
import { RegexRule, RuleResult } from './types';
import { PythonRuleCheck } from './types';
import { JavaRuleCheck } from './types';

// ═══════════════════════════════════════════════════════════════════
//
//   ScaleArch — Custom Rules
//
//   Four sections:
//     1. CUSTOM_REGEX_RULES       — line-by-line pattern matching (all languages)
//     2. CUSTOM_AST_CHECKS        — JS/TS structure-aware checks
//     3. customWholeAstChecks()   — JS/TS whole-file analysis
//     4. CUSTOM_PYTHON_AST_RULES  — Python structure-aware checks
//     5. CUSTOM_JAVA_AST_RULES    — Java structure-aware checks (tree-sitter)
//
// ═══════════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────────
//  SECTION 1 — Custom Regex Rules
// ───────────────────────────────────────────────────────────────────

export const CUSTOM_REGEX_RULES: RegexRule[] = [
  {
    id: 'custom/settimeout-zero',
    category: 'performance',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'setTimeout(fn, 0) is unreliable — use queueMicrotask() or setImmediate()',
    hint: 'setTimeout with 0ms delay is not guaranteed to run immediately and carries scheduling overhead. Use queueMicrotask() for microtask-level scheduling or setImmediate() for I/O-bound deferral.',
    test: (line) => /setTimeout\s*\(.*,\s*0\s*\)/.test(line),
  },
];


// ───────────────────────────────────────────────────────────────────
//  SECTION 2 — Custom AST (per-node) Rules  [JS/TS]
// ───────────────────────────────────────────────────────────────────

function makeRange(node: any): vscode.Range {
  const s = node.loc?.start ?? { line: 0, column: 0 };
  const e = node.loc?.end ?? { line: 0, column: 0 };
  return new vscode.Range(s.line - 1, s.column, e.line - 1, e.column);
}

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
    hint: 'Boolean parameters often mean a function does two things. Replace with an options object or split into two named functions.',
    severity: vscode.DiagnosticSeverity.Information,
  };
}

export const CUSTOM_AST_CHECKS: Array<(node: any) => RuleResult | null> = [
  checkEmptyCatch,
  checkBooleanParam,
];


// ───────────────────────────────────────────────────────────────────
//  SECTION 3 — Custom Whole-AST Rules  [JS/TS]
// ───────────────────────────────────────────────────────────────────

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

export function customWholeAstChecks(ast: any): RuleResult[] {
  return [
    ...checkTooManyImports(ast),
  ];
}


// ───────────────────────────────────────────────────────────────────
//  SECTION 4 — Custom Python AST Rules
// ───────────────────────────────────────────────────────────────────

function checkPyStringConcat(
  node: any,
  _cfg: any,
  makeDiag: any
): vscode.Diagnostic | null {
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

export const CUSTOM_PYTHON_AST_RULES: PythonRuleCheck[] = [
  checkPyStringConcat,
];


// ───────────────────────────────────────────────────────────────────
//  SECTION 5 — Custom Java AST Rules  (tree-sitter)
//
//  Each check is a function with this signature:
//    (node, cfg, makeDiag) => vscode.Diagnostic | null
//
//  node     — current Java AST node (node.type, startPosition, endPosition etc.)
//  cfg      — VS Code workspace config (read thresholds from here)
//  makeDiag — helper to create a Diagnostic at the node's location
//
//  IMPORTANT differences from Python rules:
//    node.type          (no underscore — tree-sitter)    vs node._type (Python)
//    node.startPosition.row  (0-based)                  vs node.lineno (1-based)
//    node.childForFieldName("name")?.text               vs node.name (Python)
//    node.namedChildren                                 vs node.body (Python)
//
//  Useful Java node types (node.type field):
//    method_declaration      — method definitions
//    class_declaration       — class definitions
//    catch_clause            — catch block in try/catch
//    method_invocation       — any method call
//    import_declaration      — import statements
//    formal_parameters       — method parameter list
//    block_comment           — /** Javadoc */ comments
//
//  Tip: run this to see node types for any Java snippet:
//    const p = new Parser(); p.setLanguage(Java);
//    console.log(p.parse("public class Foo {}").rootNode.toString());
// ───────────────────────────────────────────────────────────────────

const checkNoSysout: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'method_invocation') return null;

  const obj    = node.childForFieldName('object')?.text;
  const method = node.childForFieldName('name')?.text;

  if (obj !== 'System.out' && obj !== 'System.err') return null;
  if (method !== 'println' && method !== 'print') return null;

  return makeDiag(
    node,
    'Use a logger instead of System.out — not suitable for production',
    vscode.DiagnosticSeverity.Information,
    'custom/java-no-sysout',
    'System.out.println has no log levels, no timestamps, and cannot be disabled in production. Use SLF4J: logger.info("message") or logger.debug("value: {}", val)'
  );
};

export const CUSTOM_JAVA_AST_RULES: JavaRuleCheck[] = [
  // add your Java AST rule const name here ↓
  checkNoSysout,
];