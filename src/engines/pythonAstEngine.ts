/* eslint-disable curly */
import * as vscode from 'vscode';
import { execSync, spawnSync } from 'child_process';
import { IAstEngine } from './astGateway';
import { PythonNode } from '../rules/types';
import { PYTHON_AST_RULES } from '../rules/pythonAstRules';
import { CUSTOM_PYTHON_AST_RULES } from '../rules/customRules';

// ─────────────────────────────────────────────────────
//  PythonAstEngine  (v0.3)
//
//  Uses Python's built-in ast module — no extra deps.
//  Requires Python 3.8+ on the user's machine.
//
//  Detection strategy (in order):
//    1. scalearch.pythonPath setting (user override)
//    2. python3   (standard on macOS / Linux)
//    3. python    (standard on Windows)
//    4. py        (Windows Python Launcher)
//  If none found → one-time warning, then silent.
// ─────────────────────────────────────────────────────

// PythonNode lives in rules/types.ts to avoid circular imports
export class PythonAstEngine implements IAstEngine {

  // Shared output channel — visible in View → Output → ScaleArch (Python)
  private static _channel: vscode.OutputChannel | undefined;
  private static getChannel(): vscode.OutputChannel {
    if (!PythonAstEngine._channel) {
      PythonAstEngine._channel = vscode.window.createOutputChannel('ScaleArch (Python)');
    }
    return PythonAstEngine._channel;
  }

  // Cached python executable path — resolved once per session
  private pythonPath: string | null | undefined = undefined;
  // undefined = not yet checked, null = checked and not found

  // Warn only once per session so we don't spam the user
  private hasWarnedAboutMissingPython = false;

  analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
    const cfg = vscode.workspace.getConfiguration('scalearch');
    const log = PythonAstEngine.getChannel();

    log.appendLine(`[ScaleArch] Python engine called for: ${document.fileName}`);

    // Bail early if Python AST is disabled in settings
    if (!cfg.get<boolean>('enablePythonAst', true)) {
      log.appendLine('[ScaleArch] Python AST disabled in settings — skipping');
      return [];
    }

    // Resolve python path — re-detect if user has set pythonPath setting
    const userPath = cfg.get<string>('pythonPath', '');
    if (this.pythonPath === undefined || (userPath && this.pythonPath === null)) {
      this.pythonPath = this.detectPython(userPath);
      log.appendLine(`[ScaleArch] Python detected: ${this.pythonPath ?? 'NOT FOUND'}`);
    }

    // No Python found — warn once then skip
    if (this.pythonPath === null) {
      if (!this.hasWarnedAboutMissingPython) {
        this.hasWarnedAboutMissingPython = true;
        vscode.window.showWarningMessage(
          'ScaleArch: Python 3.8+ not found — AST rules are disabled for .py files. ' +
          'Regex rules are still active. ' +
          'Install Python or set scalearch.pythonPath in settings to enable full analysis.',
          'Open Settings'
        ).then(choice => {
          if (choice === 'Open Settings') {
            vscode.commands.executeCommand(
              'workbench.action.openSettings',
              'scalearch.pythonPath'
            );
          }
        });
      }
      return [];
    }

    // ── Parse + walk + run rules ──────────────────────
    const source = document.getText();
    log.appendLine(`[ScaleArch] Parsing ${document.fileName} (${source.length} chars)`);
    const ast    = this.parseSource(source);
    if (!ast) {
      log.appendLine('[ScaleArch] parseSource returned null — syntax error or spawn failed');
      return [];
    }
    log.appendLine(`[ScaleArch] Parse succeeded, _type: ${(ast as any)._type}`);

    const diagnostics: vscode.Diagnostic[] = [];

    // Merge core rules + user custom rules — custom rules run last
    const allRules = [...PYTHON_AST_RULES, ...CUSTOM_PYTHON_AST_RULES];

    this.walk(ast, (node: PythonNode) => {
      for (const rule of allRules) {
        const diag = rule(node, cfg, this.makeDiagnostic.bind(this));
        if (diag) diagnostics.push(diag);
      }
    });

    log.appendLine(`[ScaleArch] Python AST diagnostics: ${diagnostics.length}`);
    return diagnostics;
  }

  // ── AST runner ───────────────────────────────────
  // Passes source to Python via stdin — no temp files needed.
  // Uses annotate_fields=True + include_attributes=True so every
  // node carries lineno and col_offset for squiggle placement.
  private parseSource(source: string): PythonNode | null {
    // Write the Python AST script to a temp file to avoid Windows
    // command-line escaping issues when passing multiline scripts via -c.
    const os   = require('os');
    const fs   = require('fs');
    const path = require('path');

    const scriptContent = [
      'import ast, json, sys, io',
      '',
      '# Force UTF-8 on Windows stdin',
      'sys.stdin  = io.TextIOWrapper(sys.stdin.buffer,  encoding="utf-8")',
      'sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")',
      '',
      'def to_dict(node):',
      '    if isinstance(node, ast.AST):',
      '        d = {"_type": node.__class__.__name__}',
      '        for field, value in ast.iter_fields(node):',
      '            d[field] = to_dict(value)',
      '        for attr in node._attributes:',
      '            if hasattr(node, attr):',
      '                d[attr] = getattr(node, attr)',
      '        return d',
      '    elif isinstance(node, list):',
      '        return [to_dict(i) for i in node]',
      '    else:',
      '        return node',
      '',
      'try:',
      '    src  = sys.stdin.read()',
      '    tree = ast.parse(src)',
      '    sys.stdout.write(json.dumps(to_dict(tree)))',
      '    sys.stdout.write(chr(10))',
      '    sys.stdout.flush()',
      'except Exception as e:',
      '    sys.stdout.write(json.dumps({"_type": "SyntaxError", "msg": str(e)}))',
      '    sys.stdout.write(chr(10))',
      '    sys.stdout.flush()',
    ].join('\n');

    const tmpScript = path.join(os.tmpdir(), 'scalearch_ast_runner.py');
    try {
      fs.writeFileSync(tmpScript, scriptContent, 'utf8');
    } catch {
      return null;
    }

    let result;
    try {
      result = spawnSync(
        this.pythonPath!,
        [tmpScript],
        {
          input:    source,
          encoding: 'utf8',
          timeout:  5000,
        }
      );
    } catch {
      return null;
    }

    const log = PythonAstEngine.getChannel();
    log.appendLine(`[ScaleArch] spawnSync status: ${result.status}`);
    log.appendLine(`[ScaleArch] spawnSync stdout: ${(result.stdout ?? '').substring(0, 100)}`);
    log.appendLine(`[ScaleArch] spawnSync stderr: ${(result.stderr ?? '').substring(0, 200)}`);

    if (result.status !== 0 || !result.stdout) return null;

    try {
      const parsed = JSON.parse(result.stdout.trim());
      if (parsed._type === 'SyntaxError') {
        log.appendLine(`[ScaleArch] Python SyntaxError: ${parsed.msg}`);
        return null;
      }
      return parsed as PythonNode;
    } catch (e) {
      log.appendLine(`[ScaleArch] JSON.parse failed: ${e}`);
      return null;
    }
  }

  // ── Node walker ───────────────────────────────────
  // Python's ast.dump() output shape:
  //   { "_type": "Module", "body": [...nodes] }
  //   { "_type": "FunctionDef", "name": "...", "body": [...], "lineno": 5 }
  //
  // Child nodes live in fields whose values are either a node
  // object (has "_type") or an array of node objects.
  // We recurse into both.
  private walk(node: PythonNode, visit: (n: PythonNode) => void): void {
    if (!node || typeof node !== 'object') return;

    visit(node);

    for (const key of Object.keys(node)) {
      const val = (node as any)[key];

      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && item._type) {
            this.walk(item as PythonNode, visit);
          }
        }
      } else if (val && typeof val === 'object' && val._type) {
        this.walk(val as PythonNode, visit);
      }
    }
  }

  // ── Diagnostic helper ─────────────────────────────
  // Python lineno is 1-based; VS Code Range is 0-based.
  // col_offset is 0-based in both — no adjustment needed.
  public makeDiagnostic(
    node:     PythonNode,
    message:  string,
    severity: vscode.DiagnosticSeverity,
    code:     string,
    hint?:    string   // optional — shown as tooltip detail on hover
  ): vscode.Diagnostic {
    const line   = (node.lineno   ?? 1) - 1;   // 1-based → 0-based
    const col    =  node.col_offset ?? 0;
    const endCol =  node.end_col_offset ?? col + 1;

    const range = new vscode.Range(line, col, line, endCol);
    // Append hint to message if provided — VS Code shows it on hover after the main message
    const fullMessage = hint
      ? `[ScaleArch] ${message}\n\n💡 ${hint}`
      : `[ScaleArch] ${message}`;
    const diag  = new vscode.Diagnostic(range, fullMessage, severity);
    diag.code   = code;
    diag.source = 'ScaleArch';
    return diag;
  }

  // ── Python detection ──────────────────────────────
  private detectPython(userPath: string): string | null {
    // Try user-configured path first
    if (userPath.trim()) {
      if (this.isValidPython(userPath.trim())) return userPath.trim();
      // User set a path but it's wrong — warn specifically
      vscode.window.showWarningMessage(
        `ScaleArch: Python not found at "${userPath}". ` +
        'Check scalearch.pythonPath in settings.'
      );
      return null;
    }

    // Auto-detect — try candidates in priority order
    const candidates = ['python3', 'python', 'py'];
    for (const candidate of candidates) {
      if (this.isValidPython(candidate)) return candidate;
    }

    return null;
  }

  // Run python --version and check it's 3.8+
  // Uses spawnSync so we can read BOTH stdout and stderr —
  // Python 2.x prints version to stderr, some Windows installs do too.
  private isValidPython(exe: string): boolean {
    try {
      const result = spawnSync(exe, ['--version'], {
        timeout:  3000,
        encoding: 'utf8',
      });
      // Combine stdout + stderr — version string appears in either depending on OS/version
      const combined = ((result.stdout ?? '') + (result.stderr ?? '')).trim();
      const log = PythonAstEngine.getChannel();
      log.appendLine(`[ScaleArch] isValidPython("${exe}") → "${combined}"`);
      return this.isSupportedVersion(combined);
    } catch {
      return false;
    }
  }

  // Parse "Python X.Y.Z" and check >= 3.8
  private isSupportedVersion(versionString: string): boolean {
    const match = versionString.match(/Python\s+(\d+)\.(\d+)/i);
    if (!match) return false;
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return major === 3 && minor >= 8;
  }
}