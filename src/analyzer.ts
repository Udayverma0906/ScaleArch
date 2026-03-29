import * as vscode from 'vscode';
import { RegexRuleEngine } from './engines/regexEngine';
import { AstRuleEngine } from './engines/astEngine';

export class Analyzer {
  private regexEngine: RegexRuleEngine;
  private astEngine: AstRuleEngine;

  constructor() {
    this.regexEngine = new RegexRuleEngine();
    this.astEngine = new AstRuleEngine();
  }

  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Layer 1: Fast regex rules (DB patterns, simple anti-patterns)
    diagnostics.push(...this.regexEngine.analyze(document));

    // Layer 2: AST rules (SOLID, complexity, duplication)
    // Only for JS/TS — Python AST needs tree-sitter (future)
    const astSupported = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    if (astSupported.includes(document.languageId)) {
      diagnostics.push(...this.astEngine.analyze(document));
    }

    return diagnostics;
  }
}