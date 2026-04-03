import * as vscode from 'vscode';
import { RegexRuleEngine } from './engines/regexEngine';
import { AstGateway }      from './engines/astGateway';

export class Analyzer {
  private regexEngine: RegexRuleEngine;
  private astGateway:  AstGateway;

  constructor() {
    this.regexEngine = new RegexRuleEngine();
    this.astGateway  = new AstGateway();
  }

  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Layer 1: Regex rules — runs on all supported languages
    diagnostics.push(...this.regexEngine.analyze(document));

    // Layer 2: AST rules — routed by AstGateway based on languageId
    //   JS/TS  → JsTsAstEngine   (typescript-estree)  v0.1 ✓
    //   Python → PythonAstEngine  (Python ast module)  v0.3 ✓
    //   Java   → JavaAstEngine   (tree-sitter-java)    v0.4 planned
    //   C/C++  → CppAstEngine    (tree-sitter-cpp)     v1.0 planned
    diagnostics.push(...this.astGateway.analyze(document));

    return diagnostics;
  }
}