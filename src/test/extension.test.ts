// ─────────────────────────────────────────────────────
//  ScaleArch Full Test File
//  Each block is labelled with the rule it should trigger
// ─────────────────────────────────────────────────────

// ─── Imports (triggers custom/too-many-imports at 15+) ───
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import * as https from 'https';
import * as crypto from 'crypto';
import * as events from 'events';
import * as stream from 'stream';
import * as buffer from 'buffer';
import * as util from 'util';
import * as url from 'url';
import * as dns from 'dns';
import * as net from 'net';
import * as zlib from 'zlib';
import * as child_process from 'child_process';
// ^ 15 imports total → triggers custom/too-many-imports

// ── Dummy classes for DIP test (not real implementations) ──
class OrderRepository {}
class FileLogger {}


// ════════════════════════════════════════════════════
//  DATABASE RULES
// ════════════════════════════════════════════════════

// ─── DB: no-select-star ──────────────────────────────
// Expected: ❌ db/no-select-star
const q1 = `SELECT * FROM users`;

// ─── DB: no-where-clause ─────────────────────────────
// Expected: ⚠️ db/no-where-clause
const q2 = `SELECT id, name FROM orders`;

// ─── DB: no-limit ────────────────────────────────────
// Expected: ⚠️ db/no-limit
const q3 = `SELECT id FROM products WHERE active = true`;

// ─── DB: leading-wildcard-like ───────────────────────
// Expected: ⚠️ db/leading-wildcard-like
const q4 = `SELECT id FROM users WHERE name LIKE '%john%'`;

// ─── DB: query-in-loop (N+1) ─────────────────────────
// Expected: ❌ db/query-in-loop
async function loadUserOrders(ids: number[]) {
  for (const id of ids) {
    const query = `SELECT * FROM orders WHERE user_id = ${id}`;
    // await db.raw(query);
  }
}


// ════════════════════════════════════════════════════
//  PERFORMANCE RULES
// ════════════════════════════════════════════════════

// ─── PERF: json-parse-in-loop ────────────────────────
// Expected: ⚠️ perf/json-parse-in-loop
function parseAll(items: string[]) {
  for (const item of items) {
    const parsed = JSON.parse(item);
    console.log(parsed);
  }
}

// ─── PERF: console-log-production ────────────────────
// Expected: ℹ️ perf/console-log-production
function processPayment(amount: number) {
  console.log('Processing payment:', amount);
  return amount * 1.1;
}

// ─── PERF: sync-fs-call ──────────────────────────────
// Expected: ❌ perf/sync-fs-call
function readConfig() {
  return fs.readFileSync('./config.json', 'utf-8');
}

// ─── PERF: new-object-in-loop ────────────────────────
// Expected: ⚠️ perf/new-object-in-loop
function buildPayloads(ids: number[]) {
  for (const id of ids) {
    const payload = { id, timestamp: new Date() };
    console.log(payload);
  }
}


// ════════════════════════════════════════════════════
//  SECURITY RULES
// ════════════════════════════════════════════════════

// ─── SECURITY: hardcoded-secret ──────────────────────
// Expected: ❌ security/hardcoded-secret (×2)
const config = {
  apiKey: 'sk-abc123supersecret',
  dbPassword: 'mypassword123',
};

// ─── SECURITY: eval ──────────────────────────────────
// Expected: ❌ security/eval-usage
function dangerousEval(input: string) {
  return eval(input);
}


// ════════════════════════════════════════════════════
//  SOLID RULES
// ════════════════════════════════════════════════════

// ─── SOLID/SRP: class with too many methods ───────────
// Expected: ⚠️ solid/srp  (11 methods > threshold of 10)
class GodClass {
  connect() {}
  disconnect() {}
  query() {}
  insert() {}
  update() {}
  delete() {}
  cache() {}
  log() {}
  validate() {}
  serialize() {}
  deserialize() {}
}

// ─── SOLID/DIP: constructor instantiates concrete deps ─
// Expected: ⚠️ solid/dip
class OrderService {
  private repo: any;
  private logger: any;
  constructor() {
    this.repo = new OrderRepository();
    this.logger = new FileLogger();
  }
}


// ════════════════════════════════════════════════════
//  CODE QUALITY RULES
// ════════════════════════════════════════════════════

// ─── QUALITY: function too long (>20 lines) ──────────
// Expected: ⚠️ quality/function-too-long
function veryLongFunction(data: any[]) {
  const step1 = data.filter((x) => x.active);
  const step2 = step1.map((x) => ({ ...x, processed: true }));
  const step3 = step2.reduce((acc, x) => acc + x.value, 0);
  const step4 = step3 * 1.1;
  const step5 = Math.round(step4);
  const step6 = step5.toString();
  const step7 = step6.padStart(10, '0');
  const step8 = `RESULT-${step7}`;
  const step9 = step8.toUpperCase();
  const step10 = step9.trim();
  const step11 = step10.split('-');
  const step12 = step11[1];
  const step13 = parseInt(step12);
  const step14 = step13 + 1;
  const step15 = step14.toString();
  const step16 = step15.padEnd(10, '0');
  const step17 = parseFloat(step16);
  const step18 = step17 / 100;
  const step19 = step18.toFixed(2);
  const step20 = parseFloat(step19);
  const step21 = step20 * 200;
  const step22 = step21 - 10;
  const step23 = step22 + 5;
  const step24 = step23 / 2;
  const step25 = Math.ceil(step24);
  return step25;
}

// ─── QUALITY: high cyclomatic complexity (>5) ────────
// Expected: ⚠️ quality/high-complexity  + ⚠️ quality/too-many-params
function complexDecision(
  a: number, b: number, c: number, d: number,
  role: string, isAdmin: boolean, isPremium: boolean
) {
  let result = '';

  if (a > 0 && b > 0) {
    result += 'ab-positive';
  } else if (a > 0 && b <= 0) {
    result += 'a-only';
  } else if (a <= 0 && b > 0) {
    result += 'b-only';
  } else {
    result += 'none';
  }

  if (c > 100 || d > 100) {
    result += '-overflow';
  } else if (c < 0 && d < 0) {
    result += '-both-negative';
  } else if (c === 0 || d === 0) {
    result += '-has-zero';
  } else {
    result += '-normal';
  }

  if (role === 'admin') {
    if (isAdmin) {
      result += '-full-access';
    } else {
      result += '-role-mismatch';
    }
  } else if (role === 'user') {
    if (isPremium) {
      result += '-premium';
    } else if (a > 50) {
      result += '-elevated';
    } else {
      result += '-basic';
    }
  } else if (role === 'guest') {
    result += '-readonly';
  } else {
    result += '-unknown-role';
  }

  const score = a + b + c + d;
  if (score > 1000) {
    result += '-high-score';
  } else if (score > 500) {
    result += '-mid-score';
  } else if (score < 0) {
    result += '-negative-score';
  }

  return result;
}

// ─── QUALITY: too many params ─────────────────────────
// Expected: ⚠️ quality/too-many-params
function createUser(
  name: string,
  email: string,
  password: string,
  role: string,
  orgId: number
) {
  return { name, email, password, role, orgId };
}

// ─── QUALITY: duplicate strings ───────────────────────
// Expected: ℹ️ quality/duplicate-string  ('application/json' × 4)
function routeHandler() {
  const base = 'application/json';
  const h1 = { 'Content-Type': 'application/json' };
  const h2 = { 'Accept': 'application/json' };
  const h3 = { 'X-Content-Type': 'application/json' };
  return { base, h1, h2, h3 };
}


// ════════════════════════════════════════════════════
//  CUSTOM RULES
// ════════════════════════════════════════════════════

// ─── CUSTOM: setTimeout with 0ms delay ───────────────
// Expected: ⚠️ custom/settimeout-zero
function deferWork(callback: () => void) {
  setTimeout(callback, 0);
}

// ─── CUSTOM: empty catch block ───────────────────────
// Expected: ⚠️ custom/empty-catch
async function fetchUserData(id: number) {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (e) {
    // silently swallowing the error — bad practice
  }
}

// ─── CUSTOM: boolean parameter ───────────────────────
// Expected: ℹ️ custom/boolean-param
function sendEmail(to: string, subject: string, isHtml: boolean = false) {
  if (isHtml) {
    console.log(`Sending HTML email to ${to}: ${subject}`);
  } else {
    console.log(`Sending plain email to ${to}: ${subject}`);
  }
}

// ─── CUSTOM: too-many-imports ────────────────────────
// Already triggered at the top of this file (15 imports)
// Expected: ℹ️ custom/too-many-imports


// ════════════════════════════════════════════════════
//  CLEAN — should NOT trigger anything
// ════════════════════════════════════════════════════

// ✅ Specific columns, WHERE, LIMIT — all good
async function getActiveUsers(orgId: number): Promise<any[]> {
  const query = `SELECT id, name, email FROM users WHERE org_id = $1 AND active = true LIMIT 50`;
  return [];
}

// ✅ COUNT query — no false positives on no-where or no-limit
async function countOrders(): Promise<number> {
  const query = `SELECT COUNT(*) FROM orders`;
  return 0;
}

// ✅ Proper try/catch with error logging
async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (e) {
    console.error('Failed to read file:', e);
    return null;
  }
}

// ✅ Clean function — short, single responsibility, few params
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}