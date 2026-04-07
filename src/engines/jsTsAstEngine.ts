/* eslint-disable curly */
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
import { IAstEngine } from './astGateway';

function cfg<T>(key: string, fallback: T): T {
  return vscode.workspace.getConfiguration('scalearch').get<T>(key, fallback);
}

// Core per-node checks. To add a rule, edit src/rules/customRules.ts only.
const PER_NODE_CHECKS = [
  checkSRP,
  checkDIP,
  checkFunctionLength,
  checkCyclomaticComplexity,
  checkDeepNesting,
  checkTooManyParams,
  ...CUSTOM_AST_CHECKS,
];

export class JsTsAstEngine implements IAstEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    // Skip entirely if SOLID and code-quality are both disabled
    const solidEnabled   = cfg<boolean>('enableSolid', true);
    const qualityEnabled = cfg<boolean>('enableCodeQuality', true);
    if (!solidEnabled && !qualityEnabled) return [];

    const source = document.getText();
    let ast: any;

    try {
      const parser = require('@typescript-eslint/typescript-estree');
      ast = parser.parse(source, {
        loc: true,
        range: true,
        jsx: document.languageId.includes('react'),
        tolerant: true,
      });
    } catch {
      return [];
    }

    const results: RuleResult[] = [];

    // Walk the entire AST once, running all per-node checks
    this.walk(ast, (node: any) => {
      for (const check of PER_NODE_CHECKS) {
        const result = check(node);
        if (result) {
          if (this.isResultEnabled(result.code)) {
            results.push(result);
          }
        }
      }
    });

    // Whole-AST checks
    if (qualityEnabled) {
      results.push(...checkDuplicateStrings(ast));
      results.push(...customWholeAstChecks(ast));
    }

    return results.map((r) => this.toDiagnostic(r));
  }

  private isResultEnabled(code: string): boolean {
    if (code.startsWith('solid/'))   return cfg<boolean>('enableSolid', true);
    if (code.startsWith('quality/')) return cfg<boolean>('enableCodeQuality', true);
    if (code.startsWith('custom/'))  return true;
    return true;
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
    const fullMessage = r.hint
      ? `[ScaleArch] ${r.message}\n\n💡 ${r.hint}`
      : `[ScaleArch] ${r.message}`;
    const diag = new vscode.Diagnostic(r.range, fullMessage, r.severity);
    diag.code = r.code;
    diag.source = 'ScaleArch';
    return diag;
  }
}