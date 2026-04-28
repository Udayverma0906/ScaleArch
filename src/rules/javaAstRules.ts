/* eslint-disable curly */
// ─────────────────────────────────────────────────────────────────────────────
//  ScaleArch — Java AST Rules (Phase 3)
//
//  5 rules implemented in order of complexity (simplest first):
//    1. java/ast-method-too-long        — method_declaration line count
//    2. java/ast-class-too-many-methods — class_declaration method count
//    3. java/ast-too-many-params        — method_declaration param count
//    4. java/ast-empty-catch            — catch_clause with empty body
//    5. java/ast-missing-javadoc        — public method without /** comment
// Then added more rules covering design principles, security, and reliability:
//
//  Key tree-sitter vs Python differences (do not copy Python patterns):
//    node.type             (NO underscore)   vs  node._type (Python)
//    node.startPosition.row (0-based)        vs  node.lineno (1-based)
//    node.childForFieldName("name")?.text    vs  node.name (Python)
//    node.namedChildren                      vs  node.body (Python)
// ─────────────────────────────────────────────────────────────────────────────

import * as vscode from 'vscode';
import { JavaNode, JavaRuleCheck } from './types';

// ── Rule 1: java/ast-method-too-long ─────────────────────────────────────────
//  Flags any method whose body spans more lines than the threshold.
//  Node: method_declaration
//  Check: endPosition.row - startPosition.row > threshold
const checkMethodTooLong: JavaRuleCheck = (node, cfg, makeDiag) => {
  if (node.type !== 'method_declaration') return null;

  const threshold = cfg.get<number>('maxJavaMethodLines', 40);
  const lineCount = node.endPosition.row - node.startPosition.row;

  if (lineCount <= threshold) return null;

  const name = node.childForFieldName('name')?.text ?? 'unknown';
  return makeDiag(
    node,
    `Method '${name}' is ${lineCount} lines — exceeds ${threshold}-line limit`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-method-too-long',
    `Long methods are hard to read, test, and maintain. Extract logical sections into smaller private methods with descriptive names.`
  );
};

// ── Rule 2: java/ast-class-too-many-methods ───────────────────────────────────
//  Flags any class that has more methods than the threshold.
//  Node: class_declaration
//  Check: count namedChildren where child.type === 'method_declaration'
const checkClassTooManyMethods: JavaRuleCheck = (node, cfg, makeDiag) => {
  if (node.type !== 'class_declaration') return null;

  const threshold = cfg.get<number>('maxJavaClassMethods', 10);
  const body = node.childForFieldName('body');
  if (!body) return null;

  const methodCount = body.namedChildren.filter(
    (c: JavaNode) => c.type === 'method_declaration'
  ).length;

  if (methodCount <= threshold) return null;

  const name = node.childForFieldName('name')?.text ?? 'unknown';
  return makeDiag(
    node,
    `Class '${name}' has ${methodCount} methods — exceeds ${threshold}-method limit (SRP)`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-class-too-many-methods',
    `A class with many methods likely violates the Single Responsibility Principle. Consider splitting into smaller focused classes.`
  );
};

// ── Rule 3: java/ast-too-many-params ─────────────────────────────────────────
//  Flags any method with more parameters than the threshold.
//  Node: method_declaration
//  Check: count namedChildren of formal_parameters where type === 'formal_parameter'
const checkTooManyParams: JavaRuleCheck = (node, cfg, makeDiag) => {
  if (node.type !== 'method_declaration') return null;

  const threshold  = cfg.get<number>('maxJavaParams', 4);
  const params     = node.childForFieldName('parameters');
  if (!params) return null;

  const paramCount = params.namedChildren.filter(
    (c: JavaNode) => c.type === 'formal_parameter'
  ).length;

  if (paramCount <= threshold) return null;

  const name = node.childForFieldName('name')?.text ?? 'unknown';
  return makeDiag(
    node,
    `Method '${name}' has ${paramCount} parameters — exceeds ${threshold}-param limit`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-too-many-params',
    `Too many parameters make a method hard to call correctly. Consider grouping related parameters into a parameter object or builder pattern.`
  );
};

// ── Rule 4: java/ast-empty-catch ─────────────────────────────────────────────
//  Flags catch blocks with an empty body — silently swallowing exceptions.
//  Node: catch_clause
//  Check: childForFieldName('body').namedChildren.length === 0
const checkEmptyCatch: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'catch_clause') return null;

  const body = node.childForFieldName('body');
  if (!body) return null;

  // namedChildren excludes syntax tokens (braces) — if 0, body is truly empty
  if (body.namedChildren.length > 0) return null;

  return makeDiag(
    node,
    'Empty catch block — exception is being silently swallowed',
    vscode.DiagnosticSeverity.Error,
    'java/ast-empty-catch',
    `Silent catch blocks hide bugs and make debugging very difficult. At minimum log the exception: catch (Exception e) { logger.error("...", e); }`
  );
};

// ── Rule 5: java/ast-public-field ────────────────────────────────────────────
//  Flags public non-final instance fields.
//  Node: field_declaration
//  Check: modifiers include 'public' but NOT 'final'
const checkPublicField: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'field_declaration') return null;

  const modifiers = node.namedChildren.find(
    (c: JavaNode) => c.type === 'modifiers'
  );
  if (!modifiers) return null;

  const modText = modifiers.text;

  if (!modText.includes('public')) return null;
  if (modText.includes('final')) return null;

  const declarator = node.namedChildren.find(
    (c: JavaNode) => c.type === 'variable_declarator'
  );
  const name = declarator?.childForFieldName('name')?.text ?? 'unknown';

  return makeDiag(
    node,
    `Public field '${name}' breaks encapsulation — use private + getter/setter`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-public-field',
    `Public mutable fields allow any code to read and modify internal state directly. Declare the field private and expose it via getters/setters to maintain control over class invariants.`
  );
};



// ── Rule 6: java/ast-deep-nesting ────────────────────────────────────────────
//  Flags code nested more than 3 levels deep (if/for/while/try/switch).
//  Node: any block-creating statement
//  Check: count nesting depth by walking up parent chain
const NESTING_TYPES = new Set([
  'if_statement', 'for_statement', 'enhanced_for_statement',
  'while_statement', 'do_statement', 'try_statement', 'switch_expression'
]);

function getNestingDepth(node: JavaNode): number {
  let depth = 0;
  let current: JavaNode | null = node.parent;
  while (current) {
    if (NESTING_TYPES.has(current.type)) depth++;
    current = current.parent;
  }
  return depth;
}

const checkDeepNesting: JavaRuleCheck = (node, cfg, makeDiag) => {
  if (!NESTING_TYPES.has(node.type)) return null;

  const threshold = cfg.get<number>('maxNestingDepth', 3);
  const depth = getNestingDepth(node);

  if (depth < threshold) return null;

  return makeDiag(
    node,
    `Nesting depth ${depth + 1} exceeds ${threshold}-level limit`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-deep-nesting',
    `Deep nesting makes code hard to read and test. Extract inner blocks into separate methods, use early returns, or invert conditions to reduce nesting.`
  );
};

// ── Rule 7: java/ast-too-many-fields ─────────────────────────────────────────
//  Flags classes with too many fields — God Object smell.
//  Node: class_declaration
//  Check: count field_declaration namedChildren in body
const checkTooManyFields: JavaRuleCheck = (node, cfg, makeDiag) => {
  if (node.type !== 'class_declaration') return null;

  const threshold = cfg.get<number>('maxJavaClassFields', 8);
  const body = node.childForFieldName('body');
  if (!body) return null;

  const fieldCount = body.namedChildren.filter(
    (c: JavaNode) => c.type === 'field_declaration'
  ).length;

  if (fieldCount <= threshold) return null;

  const name = node.childForFieldName('name')?.text ?? 'unknown';
  return makeDiag(
    node,
    `Class '${name}' has ${fieldCount} fields — exceeds ${threshold}-field limit (God Object)`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-too-many-fields',
    `A class with many fields is likely doing too much. Consider splitting responsibilities into smaller, focused classes or using composition.`
  );
};

// ── Rule 8: java/ast-interface-too-large ─────────────────────────────────────
//  Flags interfaces with too many methods — Interface Segregation violation.
//  Node: interface_declaration
//  Check: count method_declaration namedChildren in body
const checkInterfaceTooLarge: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'interface_declaration') return null;

  const THRESHOLD = 5;
  const body = node.childForFieldName('body');
  if (!body) return null;

  const methodCount = body.namedChildren.filter(
    (c: JavaNode) => c.type === 'method_declaration'
  ).length;

  if (methodCount <= THRESHOLD) return null;

  const name = node.childForFieldName('name')?.text ?? 'unknown';
  return makeDiag(
    node,
    `Interface '${name}' has ${methodCount} methods — violates Interface Segregation Principle`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-interface-too-large',
    `Large interfaces force implementors to provide methods they don't need. Split into smaller, focused interfaces — clients should not depend on methods they don't use.`
  );
};

// ── Rule 9: java/ast-system-exit ─────────────────────────────────────────────
//  Flags System.exit() calls outside of main() — kills the entire JVM.
//  Node: method_invocation
//  Check: object is 'System', method is 'exit'
const checkSystemExit: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'method_invocation') return null;

  const obj    = node.childForFieldName('object')?.text;
  const method = node.childForFieldName('name')?.text;

  if (obj !== 'System' || method !== 'exit') return null;

  // Allow inside main() — walk up to find enclosing method name
  let current: JavaNode | null = node.parent;
  while (current) {
    if (current.type === 'method_declaration') {
      const methodName = current.childForFieldName('name')?.text;
      if (methodName === 'main') return null;
      break;
    }
    current = current.parent;
  }

  return makeDiag(
    node,
    'System.exit() terminates the entire JVM — avoid in library or service code',
    vscode.DiagnosticSeverity.Error,
    'java/ast-system-exit',
    `System.exit() immediately shuts down the JVM including all threads and hooks. Throw an exception instead, or propagate the error to the caller.`
  );
};

// ── Rule 10: java/ast-thread-sleep ───────────────────────────────────────────
//  Flags Thread.sleep() calls — unreliable timing in production code.
//  Node: method_invocation
//  Check: object is 'Thread', method is 'sleep'
const checkThreadSleep: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'method_invocation') return null;

  const obj    = node.childForFieldName('object')?.text;
  const method = node.childForFieldName('name')?.text;

  if (obj !== 'Thread' || method !== 'sleep') return null;

  return makeDiag(
    node,
    'Thread.sleep() is unreliable for timing — use ScheduledExecutorService instead',
    vscode.DiagnosticSeverity.Warning,
    'java/ast-thread-sleep',
    `Thread.sleep() is not guaranteed to sleep for exactly the specified time and blocks the thread entirely. Use ScheduledExecutorService for scheduled tasks or CountDownLatch for synchronisation.`
  );
};

// ── Rule 11: java/ast-magic-number ───────────────────────────────────────────
//  Flags numeric literals not assigned to a named constant.
//  Node: decimal_integer_literal / decimal_floating_point_literal
//  Skip: 0, 1, -1 (universally understood), and variable_declarator with final modifier
const MAGIC_SKIP = new Set(['0', '1', '-1', '2']);

const checkMagicNumber: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'decimal_integer_literal' &&
      node.type !== 'decimal_floating_point_literal') return null;

  const value = node.text.replace(/_/g, '').replace(/[lLfFdD]$/, '');
  if (MAGIC_SKIP.has(value)) return null;

  // Skip if inside a field_declaration with final modifier (it IS the constant)
  let current: JavaNode | null = node.parent;
  while (current) {
    if (current.type === 'field_declaration') {
      const mods = current.namedChildren.find((c: JavaNode) => c.type === 'modifiers');
      if (mods?.text.includes('final')) return null;
      break;
    }
    // Also skip array initialisers and annotation values
    if (current.type === 'array_initializer' ||
        current.type === 'annotation'         ||
        current.type === 'element_value_pair') return null;
    current = current.parent;
  }

  return makeDiag(
    node,
    `Magic number '${node.text}' — extract to a named constant`,
    vscode.DiagnosticSeverity.Information,
    'java/ast-magic-number',
    `Magic numbers make code hard to understand and maintain. Declare a named constant: private static final int MY_CONSTANT = ${node.text};`
  );
};

// ── Rule 12: java/ast-string-equals-compare ──────────────────────────────────
//  Flags == or != comparisons where one side is a string literal.
//  Node: binary_expression
//  Check: operator is == or !=, and one operand is a string_literal
const checkStringEqualsCompare: JavaRuleCheck = (node, _cfg, makeDiag) => {
  if (node.type !== 'binary_expression') return null;

  const operator = node.namedChildren.find(
    (c: JavaNode) => c.type === 'binary_operator' || c.text === '==' || c.text === '!='
  );

  // tree-sitter puts the operator as a non-named child — check via text
  const nodeText = node.text;
  const hasEqOp  = /\s==\s|\s!=\s/.test(nodeText);
  if (!hasEqOp) return null;

  const hasStringLiteral = node.namedChildren.some(
    (c: JavaNode) => c.type === 'string_literal'
  );
  if (!hasStringLiteral) return null;

  return makeDiag(
    node,
    'String compared with == or != — use .equals() instead',
    vscode.DiagnosticSeverity.Error,
    'java/ast-string-equals-compare',
    `== compares object references, not string content. Two strings with the same characters may be different objects. Use str.equals("value") or Objects.equals(str, "value") for null-safe comparison.`
  );
};

// ── Rule 13: java/ast-constructor-too-many-params ────────────────────────────
//  Flags constructors with too many parameters — use Builder pattern instead.
//  Node: constructor_declaration
//  Check: count formal_parameter in parameters
const checkConstructorTooManyParams: JavaRuleCheck = (node, cfg, makeDiag) => {
  if (node.type !== 'constructor_declaration') return null;

  const threshold  = cfg.get<number>('maxJavaParams', 4);
  const params     = node.childForFieldName('parameters');
  if (!params) return null;

  const paramCount = params.namedChildren.filter(
    (c: JavaNode) => c.type === 'formal_parameter'
  ).length;

  if (paramCount <= threshold) return null;

  const name = node.childForFieldName('name')?.text ?? 'unknown';
  return makeDiag(
    node,
    `Constructor '${name}' has ${paramCount} parameters — consider Builder pattern`,
    vscode.DiagnosticSeverity.Warning,
    'java/ast-constructor-too-many-params',
    `Constructors with many parameters are hard to call correctly and lead to telescoping constructor anti-pattern. Use the Builder pattern or a factory method instead.`
  );
};

// ── Export all rules ──────────────────────────────────────────────────────────
export const JAVA_AST_RULES: JavaRuleCheck[] = [
  // Code quality
  checkMethodTooLong,
  checkClassTooManyMethods,
  checkTooManyParams,
  checkConstructorTooManyParams,
  checkEmptyCatch,
  checkDeepNesting,
  checkTooManyFields,
  checkMagicNumber,
  // Design / SOLID
  checkInterfaceTooLarge,
  checkPublicField,
  // Security / reliability
  checkSystemExit,
  checkThreadSleep,
  checkStringEqualsCompare,
];