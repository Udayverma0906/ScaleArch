import * as vscode from 'vscode';
import { DB_RULES, PERF_RULES, SECURITY_RULES } from '../rules/regexRules';
import { CUSTOM_REGEX_RULES } from '../rules/customRules';
import { RegexRule } from '../rules/types';

// Core rules + custom rules merged automatically.
// To add a regex rule, edit src/rules/customRules.ts only.
const ALL_REGEX_RULES: RegexRule[] = [
  ...DB_RULES,
  ...PERF_RULES,
  ...SECURITY_RULES,
  ...CUSTOM_REGEX_RULES,
];

export class RegexRuleEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      // Skip commented lines
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) return;

      for (const rule of ALL_REGEX_RULES) {
        if (rule.test(line, lines, index)) {
          const range = new vscode.Range(index, 0, index, line.length);
          const diag = new vscode.Diagnostic(range, `[ScaleArch] ${rule.message}`, rule.severity);
          diag.code = rule.id;
          diag.source = 'ScaleArch';
          diagnostics.push(diag);
        }
      }
    });

    return diagnostics;
  }
}