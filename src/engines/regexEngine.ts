import * as vscode from 'vscode';
import { DB_RULES, PERF_RULES, SECURITY_RULES } from '../rules/regexRules';
import { CUSTOM_REGEX_RULES } from '../rules/customRules';
import { RegexRule } from '../rules/types';

export class RegexRuleEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const cfg = vscode.workspace.getConfiguration('scalearch');

    // Respect enable/disable toggles — checked at analysis time, not module load.
    // To add a regex rule, edit src/rules/customRules.ts only.
    const activeRules: RegexRule[] = [
      ...(cfg.get('enableDatabase', true) ? DB_RULES : []),
      ...(cfg.get('enablePerformance', true) ? PERF_RULES : []),
      ...(cfg.get('enableSecurity', true) ? SECURITY_RULES : []),
      ...CUSTOM_REGEX_RULES,
    ];

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      // Skip commented lines
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) return;

      for (const rule of activeRules) {
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