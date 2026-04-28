// ─────────────────────────────────────────────────────────────────────────────
//  ScaleArch — Java AST Engine (Phase 2)
//
//  Parser:    tree-sitter-java (native Node.js binding — no child process)
//  Logging:   5-checkpoint OutputChannel pattern
//  Rules:     Phase 3 (empty for now)
//
//  CRITICAL: tree-sitter and tree-sitter-java are in webpack externals.
//  Do NOT remove them or extension will crash on load.
// ─────────────────────────────────────────────────────────────────────────────

import * as vscode from 'vscode';
import { IAstEngine } from './astGateway';
import { JavaNode, JavaRuleCheck } from '../rules/types';
import { CUSTOM_JAVA_AST_RULES } from '../rules/customRules';
import { JAVA_AST_RULES } from '../rules/javaAstRules';

// tree-sitter loaded via externals — not bundled by webpack
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Parser = require('tree-sitter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Java   = require('tree-sitter-java');

// ── OutputChannel — view in: Extension Development Host → View → Output → "ScaleArch (Java)"
let channel: vscode.OutputChannel | undefined;
function getChannel(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel('ScaleArch (Java)');
  return channel;
}

// ── makeDiagnostic ────────────────────────────────────────────────────────────
//  Converts a JavaNode + metadata into a VS Code Diagnostic.
//  tree-sitter positions are 0-based — same as VS Code Range. No adjustment.
function makeDiagnostic(
  node:     JavaNode,
  message:  string,
  severity: vscode.DiagnosticSeverity,
  code:     string,
  hint?:    string
): vscode.Diagnostic {
  const range = new vscode.Range(
    node.startPosition.row,
    node.startPosition.column,
    node.endPosition.row,
    node.endPosition.column
  );
  // Append hint to message so it shows in the hover tooltip
  const fullMessage = hint
    ? `[ScaleArch] ${message}\n\n💡 ${hint}`
    : `[ScaleArch] ${message}`;
  const diag = new vscode.Diagnostic(range, fullMessage, severity);
  diag.code   = code;
  diag.source = 'ScaleArch';
  return diag;
}

// ── walkTree ──────────────────────────────────────────────────────────────────
//  Recursively visits every node in the tree-sitter AST.
//  Calls visitor() on each node. Returns collected diagnostics.
function walkTree(
  node:     JavaNode,
  visitor:  (n: JavaNode) => vscode.Diagnostic | null
): vscode.Diagnostic[] {
  const results: vscode.Diagnostic[] = [];
  const diag = visitor(node);
  if (diag) results.push(diag);
  for (const child of node.namedChildren) {
    results.push(...walkTree(child, visitor));
  }
  return results;
}

// ── JavaAstEngine ─────────────────────────────────────────────────────────────
export class JavaAstEngine implements IAstEngine {

  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const ch = getChannel();

    // ── Checkpoint 1: engine reached ─────────────────────────────────────────
    ch.appendLine(`[ScaleArch] Java engine called for: ${document.fileName}`);

    const cfg = vscode.workspace.getConfiguration('scalearch');
    if (!cfg.get<boolean>('enableJavaAst', true)) {
      ch.appendLine('[ScaleArch] Java AST disabled in settings — skipping');
      return [];
    }

    let parser: any;
    try {
      parser = new Parser();
      parser.setLanguage(Java);
      // ── Checkpoint 2: tree-sitter loaded ───────────────────────────────────
      ch.appendLine(`[ScaleArch] tree-sitter loaded ok`);
    } catch (e) {
      ch.appendLine(`[ScaleArch] ERROR loading tree-sitter: ${e}`);
      ch.appendLine('[ScaleArch] Check that tree-sitter and tree-sitter-java are in webpack externals');
      return [];
    }

    const source = document.getText();

    // ── Checkpoint 3: parse starting ─────────────────────────────────────────
    ch.appendLine(`[ScaleArch] Parsing ${document.fileName} (${source.length} chars)`);

    let tree: any;
    try {
      tree = parser.parse(source);
    } catch (e) {
      ch.appendLine(`[ScaleArch] ERROR parsing: ${e}`);
      return [];
    }

    // ── Checkpoint 4: parse succeeded ────────────────────────────────────────
    ch.appendLine(`[ScaleArch] Parse succeeded, root type: ${tree.rootNode.type}`);

    // ── Collect diagnostics from all rules ────────────────────────────────────
    const allRules: JavaRuleCheck[] = [
      ...JAVA_AST_RULES,
      ...CUSTOM_JAVA_AST_RULES,
    ];

    const diagnostics: vscode.Diagnostic[] = walkTree(
      tree.rootNode as JavaNode,
      (node) => {
        for (const rule of allRules) {
          const diag = rule(node, cfg, makeDiagnostic);
          if (diag) return diag;
        }
        return null;
      }
    );

    // ── Checkpoint 5: rules ran ───────────────────────────────────────────────
    ch.appendLine(`[ScaleArch] Java AST diagnostics: ${diagnostics.length}`);

    return diagnostics;
  }
}