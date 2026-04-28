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

// ── OutputChannel ─────────────────────────────────────────────────────────────
let channel: vscode.OutputChannel | undefined;
function getChannel(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel('ScaleArch (JS/TS)');
  return channel;
}

// Pre-load parser at module level — not inside analyze()
// This ensures webpack bundles it correctly and we catch load errors early
let tsParser: any = null;
let parserLoadError: string | null = null;
try {
  tsParser = require('@typescript-eslint/typescript-estree');
} catch (e) {
  parserLoadError = String(e);
}

// Core per-node checks
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
    const ch = getChannel();
    ch.appendLine(`[ScaleArch] JS/TS engine called for: ${document.fileName}`);

    const solidEnabled   = cfg<boolean>('enableSolid', true);
    const qualityEnabled = cfg<boolean>('enableCodeQuality', true);
    if (!solidEnabled && !qualityEnabled) {
      ch.appendLine('[ScaleArch] JS/TS AST skipped — solid and quality both disabled');
      return [];
    }

    if (!tsParser) {
      ch.appendLine(`[ScaleArch] ERROR: @typescript-eslint/typescript-estree failed to load: ${parserLoadError}`);
      return [];
    }

    ch.appendLine('[ScaleArch] Parser loaded ok');

    const source = document.getText();
    let ast: any;

    try {
      ast = tsParser.parse(source, {
        loc: true,
        range: true,
        jsx: document.languageId.includes('react'),
        tolerant: true,
      });
      ch.appendLine('[ScaleArch] Parse succeeded');
    } catch (e) {
      ch.appendLine(`[ScaleArch] Parse failed: ${e}`);
      return [];
    }

    const results: RuleResult[] = [];

    this.walk(ast, (node: any) => {
      for (const check of PER_NODE_CHECKS) {
        const result = check(node);
        if (result && this.isResultEnabled(result.code)) {
          results.push(result);
        }
      }
    });

    if (qualityEnabled) {
      results.push(...checkDuplicateStrings(ast));
      results.push(...customWholeAstChecks(ast));
    }

    ch.appendLine(`[ScaleArch] JS/TS AST diagnostics: ${results.length}`);
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