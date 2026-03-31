import * as vscode from 'vscode';
import {
  checkSRP,
  checkDIP,
  checkFunctionLength,
  checkCyclomaticComplexity,
  checkDeepNesting,
  checkTooManyParams,
  checkDuplicateStrings,
} from '../rules/astRules';
import { CUSTOM_AST_CHECKS, customWholeAstChecks } from '../rules/customRules';
import { RuleResult } from '../rules/types';

export class AstRuleEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const cfg = vscode.workspace.getConfiguration('scalearch');

    // Respect enable/disable toggles — built at analysis time so setting changes take effect immediately.
    // To add a rule, edit src/rules/customRules.ts only.
    const perNodeChecks = [
      ...(cfg.get('enableSolid', true) ? [checkSRP, checkDIP] : []),
      checkFunctionLength,
      checkCyclomaticComplexity,
      checkDeepNesting,
      checkTooManyParams,
      ...CUSTOM_AST_CHECKS,
    ];

    const source = document.getText();
    let ast: any;

    try {
      // Dynamically require so the extension still loads if the parser isn't installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const parser = require('@typescript-eslint/typescript-estree');
      ast = parser.parse(source, {
        loc: true,
        range: true,
        jsx: document.languageId.includes('react'),
        tolerant: true,   // don't throw on syntax errors
      });
    } catch {
      // If parsing fails (e.g. syntax error in user's file) skip silently
      return [];
    }

    const results: RuleResult[] = [];

    // Walk the entire AST once, running all per-node checks
    this.walk(ast, (node: any) => {
      for (const check of perNodeChecks) {
        const result = check(node);
        if (result) results.push(result);
      }
    });

    // Whole-AST checks (need the full tree)
    results.push(...checkDuplicateStrings(ast));
    results.push(...customWholeAstChecks(ast));  // ← custom whole-AST rules

    return results.map((r) => this.toDiagnostic(r));
  }

  private walk(node: any, visit: (n: any) => void) {
    if (!node || typeof node !== 'object') return;
    visit(node);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c) => this.walk(c, visit));
      } else if (child && typeof child === 'object' && child.type) {
        this.walk(child, visit);
      }
    }
  }

  private toDiagnostic(r: RuleResult): vscode.Diagnostic {
    const diag = new vscode.Diagnostic(r.range, `[ScaleArch] ${r.message}`, r.severity);
    diag.code = r.code;
    diag.source = 'ScaleArch';
    return diag;
  }
}