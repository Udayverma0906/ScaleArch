import { RegexRule } from './types';
import * as vscode from 'vscode';

// ─────────────────────────────────────────────
//  DATABASE RULES
// ─────────────────────────────────────────────
export const DB_RULES: RegexRule[] = [
  {
    id: 'db/no-select-star',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Avoid SELECT * — fetch only the columns you need',
    hint: 'SELECT * fetches all columns including unused ones, wastes network bandwidth and prevents index-only scans.',
    test: (line) => /select\s+\*/i.test(line),
  },
  {
    id: 'db/no-where-clause',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'SELECT without WHERE — possible full table scan',
    hint: 'Without a WHERE clause every row is scanned. Add a filter or ensure this is intentional.',
    test: (line) =>
      /select\s+[\w\s,*]+from\s+\w+\s*[`;]/i.test(line) &&
      !/where/i.test(line) &&
      !/count\s*\(/i.test(line),
  },
  {
    id: 'db/no-limit',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'No LIMIT clause — risk of fetching a huge result set',
    hint: 'Always paginate results. Add LIMIT (and OFFSET) to control how many rows are returned.',
    test: (line) =>
      /\bselect\b/i.test(line) &&
      !/\blimit\b/i.test(line) &&
      !/count\s*\(/i.test(line) &&
      !/insert|update|delete/i.test(line),
  },
  {
    id: 'db/leading-wildcard-like',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Leading wildcard LIKE '%...' disables index usage",
    hint: "A leading % forces a full table scan. Consider full-text search (FULLTEXT INDEX) or a search engine like Elasticsearch.",
    test: (line) => /like\s+['"`]%/i.test(line),
  },
  {
    id: 'db/query-in-loop',
    category: 'database',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'SQL query inside a loop — classic N+1 problem',
    hint: 'Each iteration fires a separate DB round-trip. Use a JOIN, batch query (WHERE id IN (...)), or a dataloader instead.',
    test: (line, allLines, idx) => {
      if (!/\bselect\b/i.test(line)) return false;
      // Look back up to 5 lines for a loop keyword
      for (let i = Math.max(0, idx - 5); i < idx; i++) {
        if (/\b(for|while|forEach|map|reduce|filter|flatMap)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },
];

// ─────────────────────────────────────────────
//  PERFORMANCE RULES
// ─────────────────────────────────────────────
export const PERF_RULES: RegexRule[] = [
  {
    id: 'perf/json-parse-in-loop',
    category: 'performance',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'JSON.parse() inside a loop — expensive repeated parsing',
    hint: 'Parse once outside the loop and reuse the result.',
    test: (line, allLines, idx) => {
      if (!/JSON\.parse\s*\(/.test(line)) return false;
      for (let i = Math.max(0, idx - 5); i < idx; i++) {
        if (/\b(for|while|forEach|map)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },
  {
    id: 'perf/console-log-production',
    category: 'performance',
    severity: vscode.DiagnosticSeverity.Information,
    message: 'console.log() left in code — remove before production',
    hint: 'Use a proper logger (winston, pino) that can be disabled in production.',
    test: (line) => /console\.(log|warn|error|info)\s*\(/.test(line) && !/\/\/.*console/.test(line),
  },
  {
    id: 'perf/sync-fs-call',
    category: 'performance',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Synchronous fs call blocks the event loop',
    hint: 'Use the async version: readFileSync → readFile, writeFileSync → writeFile.',
    test: (line) => /\bfs\.(readFileSync|writeFileSync|existsSync|readdirSync|mkdirSync)\b/.test(line),
  },
  {
    id: 'perf/new-object-in-loop',
    category: 'performance',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Object/array created inside a loop — GC pressure',
    hint: 'Allocate outside the loop and reuse or clear per iteration to reduce garbage collection overhead.',
    test: (line, allLines, idx) => {
      if (!/(new\s+\w+\(|\[\s*\]|\{\s*\})/.test(line)) return false;
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        if (/\b(for|while|forEach)\b/.test(allLines[i])) return true;
      }
      return false;
    },
  },
];

// ─────────────────────────────────────────────
//  SECURITY RULES
// ─────────────────────────────────────────────
export const SECURITY_RULES: RegexRule[] = [
  {
    id: 'security/hardcoded-secret',
    category: 'security',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Possible hardcoded secret detected',
    hint: 'Move secrets to environment variables or a secrets manager (AWS SSM, HashiCorp Vault).',
    test: (line) =>
      /(password|secret|api_key|apikey|token|auth)\s*[:=]\s*['"`][^'"`]{6,}/i.test(line) &&
      !/process\.env/.test(line),
  },
  {
    id: 'security/eval-usage',
    category: 'security',
    severity: vscode.DiagnosticSeverity.Error,
    message: 'eval() is a security risk — avoid it',
    hint: 'eval() executes arbitrary code and can be exploited. Use JSON.parse() for data, or restructure the logic.',
    test: (line) => /\beval\s*\(/.test(line),
  },
];

