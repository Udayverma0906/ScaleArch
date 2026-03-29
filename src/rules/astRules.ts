import * as vscode from 'vscode';
import { RuleResult } from '../rules/types';

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function makeRange(node: any): vscode.Range {
  const s = node.loc?.start ?? { line: 0, column: 0 };
  const e = node.loc?.end ?? { line: 0, column: 0 };
  return new vscode.Range(s.line - 1, s.column, e.line - 1, e.column);
}

function countLines(node: any): number {
  if (!node.loc) return 0;
  return node.loc.end.line - node.loc.start.line + 1;
}

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

function getFunctionName(node: any): string {
  if (node.id?.name) return node.id.name;
  if (node.key?.name) return node.key.name;
  return '<anonymous>';
}

// ─────────────────────────────────────────────
//  SOLID — Single Responsibility Principle
//  Heuristic: class has too many methods
// ─────────────────────────────────────────────
export function checkSRP(node: any): RuleResult | null {
  if (node.type !== 'ClassDeclaration' && node.type !== 'ClassExpression') return null;

  const methods = (node.body?.body ?? []).filter(
    (m: any) => m.type === 'MethodDefinition' && m.kind !== 'constructor'
  );

  const METHOD_THRESHOLD = 10;
  if (methods.length <= METHOD_THRESHOLD) return null;

  return {
    range: makeRange(node),
    code: 'solid/srp',
    message: `[SRP] Class "${node.id?.name ?? 'Anonymous'}" has ${methods.length} methods — consider splitting responsibilities`,
    hint: `Single Responsibility Principle: a class should have one reason to change. With ${methods.length} methods it likely handles multiple concerns. Extract related methods into focused classes.`,
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ─────────────────────────────────────────────
//  SOLID — Dependency Inversion Principle
//  Heuristic: constructor instantiates concrete classes with `new`
// ─────────────────────────────────────────────
export function checkDIP(node: any): RuleResult | null {
  if (node.type !== 'MethodDefinition' || node.kind !== 'constructor') return null;

  const body = node.value?.body?.body ?? [];
  const newExpressions = getAllNodes({ body }, ['NewExpression']);

  // Filter out common value objects that are fine to instantiate
  const ALLOWED = ['Date', 'Error', 'Map', 'Set', 'RegExp', 'Promise', 'URL'];
  const violations = newExpressions.filter(
    (n: any) => n.callee?.name && !ALLOWED.includes(n.callee.name)
  );

  if (violations.length === 0) return null;

  const names = violations.map((v: any) => v.callee?.name).join(', ');
  return {
    range: makeRange(node),
    code: 'solid/dip',
    message: `[DIP] Constructor directly instantiates: ${names} — inject dependencies instead`,
    hint: `Dependency Inversion Principle: depend on abstractions, not concretions. Pass dependencies via constructor parameters so they can be swapped or mocked in tests.`,
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ─────────────────────────────────────────────
//  COMPLEXITY — Function too long
// ─────────────────────────────────────────────
export function checkFunctionLength(node: any): RuleResult | null {
  const fnTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
  if (!fnTypes.includes(node.type)) return null;
  if (!node.body || node.body.type !== 'BlockStatement') return null;

  const lines = countLines(node);
  const THRESHOLD = 24;
  if (lines <= THRESHOLD) return null;

  const name = getFunctionName(node);
  return {
    range: makeRange(node),
    code: 'quality/function-too-long',
    message: `Function "${name}" is ${lines} lines long — consider breaking it up`,
    hint: `Functions over ${THRESHOLD} lines are hard to read, test, and maintain. Extract logical sub-steps into named helper functions.`,
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ─────────────────────────────────────────────
//  COMPLEXITY — Cyclomatic complexity
//  Count branches: if, else if, for, while, case, &&, ||, ??
// ─────────────────────────────────────────────
export function checkCyclomaticComplexity(node: any): RuleResult | null {
  const fnTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
  if (!fnTypes.includes(node.type)) return null;
  if (!node.body || node.body.type !== 'BlockStatement') return null;

  const BRANCH_TYPES = [
    'IfStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
    'WhileStatement', 'DoWhileStatement', 'SwitchCase',
    'LogicalExpression', 'ConditionalExpression', 'CatchClause',
  ];

  const branches = getAllNodes(node.body, BRANCH_TYPES);

  // For LogicalExpression only count && and || (not ??)
  const count = branches.filter((n: any) => {
    if (n.type === 'LogicalExpression') return n.operator === '&&' || n.operator === '||';
    return true;
  }).length;

  const THRESHOLD = 5;
  if (count <= THRESHOLD) return null;

  const name = getFunctionName(node);
  return {
    range: makeRange(node),
    code: 'quality/high-complexity',
    message: `Function "${name}" has cyclomatic complexity of ${count} — simplify the branching logic`,
    hint: `Cyclomatic complexity > ${THRESHOLD} indicates too many code paths, making the function hard to test and understand. Extract conditions into named predicates or use early returns.`,
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ─────────────────────────────────────────────
//  COMPLEXITY — Deeply nested callbacks / blocks
// ─────────────────────────────────────────────
export function checkDeepNesting(node: any): RuleResult | null {
  if (node.type !== 'BlockStatement') return null;

  function maxDepth(n: any, depth: number): number {
    if (!n || typeof n !== 'object') return depth;
    let max = depth;
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      const child = n[key];
      const nextDepth = n.type === 'BlockStatement' ? depth + 1 : depth;
      if (Array.isArray(child)) {
        for (const c of child) max = Math.max(max, maxDepth(c, nextDepth));
      } else if (child?.type) {
        max = Math.max(max, maxDepth(child, nextDepth));
      }
    }
    return max;
  }

  const depth = maxDepth(node, 0);
  const THRESHOLD = 4;
  if (depth <= THRESHOLD) return null;

  return {
    range: makeRange(node),
    code: 'quality/deep-nesting',
    message: `Nesting depth of ${depth} — flatten this code`,
    hint: `Deep nesting is hard to read. Use early returns (guard clauses), extract nested logic into functions, or use async/await instead of nested callbacks.`,
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ─────────────────────────────────────────────
//  CODE QUALITY — Too many parameters
// ─────────────────────────────────────────────
export function checkTooManyParams(node: any): RuleResult | null {
  const fnTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
  if (!fnTypes.includes(node.type)) return null;

  const params = node.params ?? [];
  const THRESHOLD = 4;
  if (params.length <= THRESHOLD) return null;

  const name = getFunctionName(node);
  return {
    range: makeRange(node),
    code: 'quality/too-many-params',
    message: `Function "${name}" has ${params.length} parameters — use an options object`,
    hint: `More than ${THRESHOLD} parameters makes calls hard to read and easy to mix up. Group related params into a single options/config object: fn({ param1, param2, ... })`,
    severity: vscode.DiagnosticSeverity.Warning,
  };
}

// ─────────────────────────────────────────────
//  CODE QUALITY — Duplicate string literals
//  Same string used 3+ times → extract to a constant
// ─────────────────────────────────────────────
export function checkDuplicateStrings(ast: any): RuleResult[] {
  const literals = getAllNodes(ast, ['Literal']);
  const stringLiterals = literals.filter(
    (n: any) => typeof n.value === 'string' && n.value.length > 5
  );

  const freq = new Map<string, any[]>();
  for (const n of stringLiterals) {
    const key = n.value as string;
    if (!freq.has(key)) freq.set(key, []);
    freq.get(key)!.push(n);
  }

  const results: RuleResult[] = [];
  for (const [value, nodes] of freq.entries()) {
    if (nodes.length >= 3) {
      results.push({
        range: makeRange(nodes[0]),
        code: 'quality/duplicate-string',
        message: `String "${value}" repeated ${nodes.length}× — extract to a named constant`,
        hint: `Duplicate string literals make refactoring error-prone. Define: const MY_CONSTANT = "${value}" and reference the constant everywhere.`,
        severity: vscode.DiagnosticSeverity.Information,
      });
    }
  }
  return results;
}