import * as vscode from 'vscode';
import { JsTsAstEngine } from './jsTsAstEngine';
import { PythonAstEngine } from './pythonAstEngine';

// ─────────────────────────────────────────────────────
//  IAstEngine
//  Every language-specific AST engine must implement
//  this interface. AstGateway talks only to this contract
//  — it never knows which engine it's calling.
// ─────────────────────────────────────────────────────
export interface IAstEngine {
  analyze(document: vscode.TextDocument): vscode.Diagnostic[];
}

// ─────────────────────────────────────────────────────
//  AstGateway
//  Single entry point for all AST analysis.
//  Analyzer calls gateway.analyze() — the gateway picks
//  the right engine based on document.languageId.
//
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
      //   v0.3: 5 AST rules (function length, class methods, docstring,
      //         type hints, __init__ complexity)
      {
        langs:  ['python'],
        engine: new PythonAstEngine(),
      },
      // v0.4 — Java AST via tree-sitter-java
      // { langs: ['java'], engine: new JavaAstEngine() },

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