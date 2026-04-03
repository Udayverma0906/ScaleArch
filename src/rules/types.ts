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
  /**
   * Optional allowlist of VS Code languageIds this rule applies to.
   * If omitted the rule runs on ALL supported languages.
   * Examples: ['python'], ['java'], ['cpp','c'], ['typescript','javascript']
   */
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
//  Exported here to avoid circular imports between
//  pythonAstEngine ↔ pythonAstRules.
// ─────────────────────────────────────────────────────
export interface PythonNode {
  _type:           string;
  lineno?:         number;
  col_offset?:     number;
  end_lineno?:     number;
  end_col_offset?: number;
  [key: string]:   any;
}