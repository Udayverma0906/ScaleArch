import * as vscode from 'vscode';
import { Analyzer } from './analyzer';

let debounceTimer: NodeJS.Timeout | undefined;
const DEBOUNCE_MS = 600;

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection('scalearch');
  const analyzer   = new Analyzer();

  const analyze = (document: vscode.TextDocument) => {
    const supported = [
      // JS / TS
      'typescript', 'javascript', 'typescriptreact', 'javascriptreact',
      // v0.2 — regex rules and ast checks for Python
      'python',
      // regex rules only
      'java', 'cpp', 'c',
    ];
    if (!supported.includes(document.languageId)) return;
    if (document.uri.scheme !== 'file') return;

    const diagnostics = analyzer.analyze(document);
    collection.set(document.uri, diagnostics);
  };

  // Run on already open file
  if (vscode.window.activeTextEditor) {
    analyze(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('scalearch.analyze', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      analyze(editor.document);
      vscode.window.showInformationMessage('ScaleArch analysis complete ✅');
    }),

    vscode.workspace.onDidChangeTextDocument((e) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => analyze(e.document), DEBOUNCE_MS);
    }),

    vscode.workspace.onDidOpenTextDocument(analyze),
    vscode.workspace.onDidSaveTextDocument(analyze),
    vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),

    collection
  );
}

export function deactivate() {}