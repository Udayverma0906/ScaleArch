import * as vscode from 'vscode';
import { PythonNode } from './types';

// ─────────────────────────────────────────────────────
//  Python AST Rules  (v0.3)
//
//  Each rule is a function:
//    (node, cfg, makeDiag) => vscode.Diagnostic | null
//
//  node     — the current AST node (has _type, lineno etc.)
//  cfg      — VS Code workspace config for thresholds
//  makeDiag — delegate to PythonAstEngine.makeDiagnostic()
//
//  Return null  → this node is fine, skip it
//  Return Diag  → flag this node with a squiggly line
// ─────────────────────────────────────────────────────

export type PythonRuleCheck = (
  node:     PythonNode,
  cfg:      vscode.WorkspaceConfiguration,
  makeDiag: (node: PythonNode, message: string,
             severity: vscode.DiagnosticSeverity,
             code: string) => vscode.Diagnostic
) => vscode.Diagnostic | null;

// ─────────────────────────────────────────────────────
//  Rule 1 — py/ast-function-too-long
//
//  Fires on any FunctionDef or AsyncFunctionDef whose
//  body spans more than maxPythonFunctionLines lines.
//
//  Why AST not regex:
//    Regex can't reliably determine where a Python
//    function ends (indentation-based, not braces).
//    AST gives us exact lineno + end_lineno.
// ─────────────────────────────────────────────────────
export const checkPyFunctionTooLong: PythonRuleCheck = (node, cfg, makeDiag) => {
  if (node._type !== 'FunctionDef' && node._type !== 'AsyncFunctionDef') return null;

  const maxLines = cfg.get<number>('maxPythonFunctionLines', 30);
  const startLine = node.lineno ?? 1;
  const endLine   = node.end_lineno ?? startLine;
  const length    = endLine - startLine + 1;

  if (length <= maxLines) return null;

  return makeDiag(
    node,
    `Function "${node.name}" is ${length} lines — keep functions under ${maxLines} lines`,
    vscode.DiagnosticSeverity.Warning,
    'py/ast-function-too-long'
  );
};

// ─────────────────────────────────────────────────────
//  Rule 2 — py/ast-class-too-many-methods
//
//  Fires on any ClassDef with more than
//  maxPythonClassMethods methods (including __init__).
//
//  Why AST not regex:
//    Regex can't scope method counts to a class —
//    it would count methods across the whole file.
// ─────────────────────────────────────────────────────
export const checkPyClassTooManyMethods: PythonRuleCheck = (node, cfg, makeDiag) => {
  if (node._type !== 'ClassDef') return null;

  const maxMethods = cfg.get<number>('maxPythonClassMethods', 10);
  const methods    = (node.body ?? []).filter(
    (n: PythonNode) => n._type === 'FunctionDef' || n._type === 'AsyncFunctionDef'
  );

  if (methods.length <= maxMethods) return null;

  return makeDiag(
    node,
    `Class "${node.name}" has ${methods.length} methods — consider splitting (max ${maxMethods})`,
    vscode.DiagnosticSeverity.Warning,
    'py/ast-class-too-many-methods'
  );
};

// ─────────────────────────────────────────────────────
//  Rule 3 — py/ast-missing-docstring
//
//  Fires on FunctionDef / AsyncFunctionDef / ClassDef
//  whose first body statement is NOT an Expr(Constant)
//  (i.e. a string literal docstring).
//
//  Skips private/dunder methods (name starts with _)
//  because __init__, _helpers etc. rarely need one.
//
//  Why AST not regex:
//    A regex would match string literals anywhere inside
//    the body. AST checks exactly the first statement.
// ─────────────────────────────────────────────────────
export const checkPyMissingDocstring: PythonRuleCheck = (node, _cfg, makeDiag) => {
  const isFunction = node._type === 'FunctionDef' || node._type === 'AsyncFunctionDef';
  const isClass    = node._type === 'ClassDef';
  if (!isFunction && !isClass) return null;

  // Skip private / dunder methods
  const name: string = node.name ?? '';
  if (name.startsWith('_')) return null;

  const body: PythonNode[] = node.body ?? [];
  if (body.length === 0) return null;

  const first = body[0];
  const hasDocstring =
    first._type === 'Expr' &&
    first.value?._type === 'Constant' &&
    typeof first.value?.value === 'string';

  if (hasDocstring) return null;

  const kind = isClass ? 'Class' : 'Function';
  return makeDiag(
    node,
    `${kind} "${name}" has no docstring — add one to explain its purpose`,
    vscode.DiagnosticSeverity.Hint,
    'py/ast-missing-docstring'
  );
};

// ─────────────────────────────────────────────────────
//  Rule 4 — py/ast-no-type-hints
//
//  Fires on FunctionDef / AsyncFunctionDef where ALL
//  parameters have no annotation AND there is no return
//  type annotation. A function with at least one typed
//  param or a return annotation is considered partially
//  typed and is not flagged.
//
//  Skips: dunder methods (__init__, __str__ etc.)
//         functions with *args / **kwargs only
//         functions with no parameters at all
//
//  Why AST not regex:
//    Regex can't tell the difference between a missing
//    annotation and a default value that looks like one.
//    AST inspects each arg's .annotation field directly.
// ─────────────────────────────────────────────────────
export const checkPyNoTypeHints: PythonRuleCheck = (node, _cfg, makeDiag) => {
  if (node._type !== 'FunctionDef' && node._type !== 'AsyncFunctionDef') return null;

  const name: string = node.name ?? '';
  // Skip dunder methods — their signatures are defined by the Python data model
  if (name.startsWith('__') && name.endsWith('__')) return null;

  const args     = node.args ?? {};
  const allArgs: PythonNode[] = [
    ...(args.args          ?? []),   // regular params
    ...(args.posonlyargs   ?? []),   // positional-only (Python 3.8+)
    ...(args.kwonlyargs    ?? []),   // keyword-only
  ];

  // Skip functions with no meaningful params
  if (allArgs.length === 0) return null;

  // Skip if self/cls is the only param (common in stubs)
  const nonSelfArgs = allArgs.filter(
    (a: PythonNode) => a.arg !== 'self' && a.arg !== 'cls'
  );
  if (nonSelfArgs.length === 0) return null;

  const hasAnyAnnotation =
    nonSelfArgs.some((a: PythonNode) => a.annotation !== null && a.annotation !== undefined) ||
    (node.returns !== null && node.returns !== undefined);

  if (hasAnyAnnotation) return null;

  return makeDiag(
    node,
    `Function "${name}" has no type hints — add parameter and return annotations`,
    vscode.DiagnosticSeverity.Hint,
    'py/ast-no-type-hints'
  );
};

// ─────────────────────────────────────────────────────
//  Rule 5 — py/ast-init-too-complex
//
//  Fires on __init__ methods that have more than
//  maxPythonInitAssignments self.x = ... assignments.
//  Too many assignments in __init__ often signals that
//  a class is holding too much state (violates SRP).
//
//  Why AST not regex:
//    Regex can't scope assignment counts to __init__
//    and can't distinguish self.x = from local x = .
// ─────────────────────────────────────────────────────
export const checkPyInitTooComplex: PythonRuleCheck = (node, cfg, makeDiag) => {
  if (node._type !== 'FunctionDef') return null;
  if (node.name !== '__init__') return null;

  const maxAssignments = cfg.get<number>('maxPythonInitAssignments', 8);

  // Count Assign nodes whose target is an Attribute on self
  // e.g. self.x = value  →  Assign(targets=[Attribute(value=Name(id='self'))])
  const selfAssignments = (node.body ?? []).filter((stmt: PythonNode) => {
    if (stmt._type !== 'Assign') return false;
    const targets: PythonNode[] = stmt.targets ?? [];
    return targets.some(
      (t: PythonNode) =>
        t._type === 'Attribute' &&
        t.value?._type === 'Name' &&
        t.value?.id === 'self'
    );
  });

  if (selfAssignments.length <= maxAssignments) return null;

  return makeDiag(
    node,
    `__init__ assigns ${selfAssignments.length} instance variables — consider splitting this class (max ${maxAssignments})`,
    vscode.DiagnosticSeverity.Warning,
    'py/ast-init-too-complex'
  );
};

// ─────────────────────────────────────────────────────
//  REGISTRY — all active Python AST rules
//
//  To disable a rule: comment it out here.
//  To add a rule: write the function above, add it here.
// ─────────────────────────────────────────────────────
export const PYTHON_AST_RULES: PythonRuleCheck[] = [
  checkPyFunctionTooLong,
  checkPyClassTooManyMethods,
  checkPyMissingDocstring,
  checkPyNoTypeHints,
  checkPyInitTooComplex,
];