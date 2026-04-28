import * as vscode from 'vscode';

export interface RuleResult {
  range: vscode.Range;
  message: string;
  severity: vscode.DiagnosticSeverity;
  code: string;
  hint?: string;
  docUrl?: string;
}

export interface RegexRule {
  id: string;
  category: RuleCategory;
  test: (line: string, allLines: string[], lineIndex: number) => boolean;
  message: string;
  hint: string;
  severity: vscode.DiagnosticSeverity;
  languages?: string[];
}

export interface AstRule {
  id: string;
  category: RuleCategory;
  nodeTypes: string[];
  check: (node: any, source: string) => RuleResult | null;
}

export type RuleCategory =
  | 'database'
  | 'performance'
  | 'solid'
  | 'code-quality'
  | 'security';

// ─────────────────────────────────────────────────────
//  PythonNode
//  Shape of nodes returned by the Python ast module
//  via the to_dict() converter in PythonAstEngine.
// ─────────────────────────────────────────────────────
export interface PythonNode {
  _type:           string;
  lineno?:         number;
  col_offset?:     number;
  end_lineno?:     number;
  end_col_offset?: number;
  [key: string]:   any;
}

export type PythonRuleCheck = (
  node:     PythonNode,
  cfg:      vscode.WorkspaceConfiguration,
  makeDiag: (node: PythonNode, message: string,
             severity: vscode.DiagnosticSeverity,
             code: string,
             hint?: string) => vscode.Diagnostic
) => vscode.Diagnostic | null;


// ─────────────────────────────────────────────────────
//  JavaNode
//  Shape of nodes returned by tree-sitter-java.
//  tree-sitter uses node.type (NO underscore) and
//  0-based row/column positions — no adjustment needed
//  for VS Code Range (also 0-based).
// ─────────────────────────────────────────────────────
export interface JavaNode {
  /** tree-sitter node type — e.g. 'method_declaration', 'class_declaration' */
  type:          string;
  startPosition: { row: number; column: number };
  endPosition:   { row: number; column: number };
  /** Source text of this node */
  text:          string;
  /** All child nodes including syntax tokens (brackets, semicolons) */
  children:      JavaNode[];
  /** Named children only — excludes syntax tokens. Usually what you want. */
  namedChildren: JavaNode[];
  /** Parent node — useful for context checks */
  parent:        JavaNode | null;
  /** Access a named field child by field name */
  childForFieldName(name: string): JavaNode | null;
  [key: string]: any;
}

// ─────────────────────────────────────────────────────
//  JavaRuleCheck
//  Signature for all Java AST rule functions.
//  hint? is the 5th param — include from day one.
//  (Python lesson: adding hint later required 3-file update)
// ─────────────────────────────────────────────────────
export type JavaRuleCheck = (
  node:     JavaNode,
  cfg:      vscode.WorkspaceConfiguration,
  makeDiag: (
    node:     JavaNode,
    message:  string,
    severity: vscode.DiagnosticSeverity,
    code:     string,
    hint?:    string
  ) => vscode.Diagnostic
) => vscode.Diagnostic | null;