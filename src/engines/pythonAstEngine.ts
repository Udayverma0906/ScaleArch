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

    // Resolve python path if not done yet this session
    if (this.pythonPath === undefined) {
      this.pythonPath = this.detectPython(cfg.get<string>('pythonPath', ''));
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
    // ast.dump() returns a Python repr string, not JSON.
    // We use a custom node_to_dict() that recursively converts
    // the AST into a JSON-serialisable dict — same shape as our
    // PythonNode interface. lineno/col_offset come from _attributes.
    const script = [
      'import ast, json, sys',
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
      'src = sys.stdin.read()',
      'try:',
      '    tree = ast.parse(src)',
      '    print(json.dumps(to_dict(tree)))',
      'except SyntaxError as e:',
      '    print(json.dumps({"_type": "SyntaxError", "msg": str(e)}))',
    ].join('\n');

    let result;
    try {
      result = spawnSync(
        this.pythonPath!,
        ['-c', script],
        {
          input:    source,
          encoding: 'utf8',
          timeout:  5000,   // 5s max — generous for large files
        }
      );
    } catch {
      return null;
    }

    if (result.status !== 0 || !result.stdout) return null;

    try {
      const parsed = JSON.parse(result.stdout.trim());
      // If Python reported a SyntaxError in the user's file, skip silently
      if (parsed._type === 'SyntaxError') return null;
      return parsed as PythonNode;
    } catch {
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
    code:     string
  ): vscode.Diagnostic {
    const line   = (node.lineno   ?? 1) - 1;   // 1-based → 0-based
    const col    =  node.col_offset ?? 0;
    const endCol =  node.end_col_offset ?? col + 1;

    const range = new vscode.Range(line, col, line, endCol);
    const diag  = new vscode.Diagnostic(range, `[ScaleArch] ${message}`, severity);
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
  private isValidPython(exe: string): boolean {
    try {
      const output = execSync(`"${exe}" --version`, {
        timeout: 3000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // Output is e.g. "Python 3.11.2" — on some systems on stderr
      const version = output.trim();
      return this.isSupportedVersion(version);
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