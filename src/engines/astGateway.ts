import * as vscode from 'vscode';
import { JsTsAstEngine } from './jsTsAstEngine';
import { PythonAstEngine } from './pythonAstEngine';
// Phase 1: import added — engine file created in Phase 2
import { JavaAstEngine } from './javaAstEngine';

// ─────────────────────────────────────────────────────
//  IAstEngine
//  Every language-specific AST engine must implement
//  this interface. AstGateway talks only to this contract.
// ─────────────────────────────────────────────────────
export interface IAstEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[];
}

// ─────────────────────────────────────────────────────
//  AstGateway
//  Single entry point for all AST analysis.
//  To add a new language engine:
//    1. Create src/engines/yourLangAstEngine.ts
//    2. Implement IAstEngine
//    3. Add one entry to this.engines below
//    4. That's it — nothing else changes
// ─────────────────────────────────────────────────────
export class AstGateway {
  private engines: Array<{
    langs:  string[];
    engine: IAstEngine;
  }>;

  constructor() {
    this.engines = [
      // JS / TS — uses @typescript-eslint/typescript-estree
      {
        langs:  ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
        engine: new JsTsAstEngine(),
      },
      // Python — uses Python's built-in ast module (requires Python 3.8+)
      {
        langs:  ['python'],
        engine: new PythonAstEngine(),
      },
      // Java — uses tree-sitter-java (Phase 2: engine shell + logging)
      {
        langs:  ['java'],
        engine: new JavaAstEngine(),
      },

      // v1.0 — C++ AST via tree-sitter-cpp (demand-dependent)
      // { langs: ['cpp', 'c'], engine: new CppAstEngine() },
    ];
  }

  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const lang  = document.languageId;
    const entry = this.engines.find(e => e.langs.includes(lang));
    return entry ? entry.engine.analyze(document) : [];
  }
}