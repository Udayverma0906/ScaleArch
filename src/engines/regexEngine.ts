/* eslint-disable curly */
import * as vscode from 'vscode';
import { DB_RULES, PERF_RULES, SECURITY_RULES, PYTHON_RULES, JAVA_RULES, CPP_RULES } from '../rules/regexRules';
import { CUSTOM_REGEX_RULES } from '../rules/customRules';
import { RegexRule } from '../rules/types';

// Languages where # starts a comment (skip those lines)
const HASH_COMMENT_LANGS = new Set(['python', 'ruby', 'shellscript', 'yaml', 'toml', 'perl']);

// Languages where # is a preprocessor directive (DO NOT skip)
const HASH_DIRECTIVE_LANGS = new Set(['cpp', 'c']);

export class RegexRuleEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const cfg  = vscode.workspace.getConfiguration('scalearch');
    const lang = document.languageId;

    // Build active rule list respecting enable/disable toggles.
    // To add a rule, edit src/rules/customRules.ts only.
    const activeRules: RegexRule[] = [
      ...(cfg.get('enableDatabase',    true) ? DB_RULES       : []),
      ...(cfg.get('enablePerformance', true) ? PERF_RULES     : []),
      ...(cfg.get('enableSecurity',    true) ? SECURITY_RULES : []),
      ...(cfg.get('enablePython',      true) ? PYTHON_RULES   : []),
      ...(cfg.get('enableJava',        true) ? JAVA_RULES     : []),
      ...(cfg.get('enableCpp',         true) ? CPP_RULES      : []),
      ...CUSTOM_REGEX_RULES,
    ];

    const diagnostics: vscode.Diagnostic[] = [];
    const text  = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trimStart();

      // Skip single-line comments — but only when # means a comment.
      // In C/C++ # is a preprocessor directive (#define, #include) — never skip it.
      if (trimmed.startsWith('//')) return;
      if (trimmed.startsWith('*'))  return;
      if (trimmed.startsWith('#') && !HASH_DIRECTIVE_LANGS.has(lang)) return;

      for (const rule of activeRules) {
        // Language filter — skip rules that don't apply to this file type
        if (rule.languages && !rule.languages.includes(lang)) continue;

        if (rule.test(line, lines, index)) {
          const range       = new vscode.Range(index, 0, index, line.length);
          const fullMessage = rule.hint
            ? `[ScaleArch] ${rule.message}\n\n💡 ${rule.hint}`
            : `[ScaleArch] ${rule.message}`;
          const diag        = new vscode.Diagnostic(range, fullMessage, rule.severity);
          diag.code         = rule.id;
          diag.source       = 'ScaleArch';
          diagnostics.push(diag);
        }
      }
    });

    return diagnostics;
  }
}