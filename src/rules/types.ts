import * as vscode from 'vscode';

export interface RuleResult {
  range: vscode.Range;
  message: string;
  severity: vscode.DiagnosticSeverity;
  code: string;
  hint?: string;        // shown in hover
  docUrl?: string;      // link to docs
}

export interface RegexRule {
  id: string;
  category: RuleCategory;
  test: (line: string, allLines: string[], lineIndex: number) => boolean;
  message: string;
  hint: string;
  severity: vscode.DiagnosticSeverity;
}

export interface AstRule {
  id: string;
  category: RuleCategory;
  nodeTypes: string[];   // AST node types this rule visits
  check: (node: any, source: string) => RuleResult | null;
}

export type RuleCategory =
  | 'database'
  | 'performance'
  | 'solid'
  | 'code-quality'
  | 'security';