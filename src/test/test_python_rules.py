# ─────────────────────────────────────────────────────────────────────
#  ScaleArch — Test File  (Python)
#  Open this file in the Extension Development Host to verify all
#  Python rules fire correctly.
#
#  Each section lists the rule ID and expected severity icon:
#    ❌ Error  ⚠️ Warning  ℹ️ Info  💡 Hint
# ─────────────────────────────────────────────────────────────────────

import subprocess
import logging


# ═══════════════════════════════════════════════════════════════
#  DATABASE RULES  (regex engine — all languages)
# ═══════════════════════════════════════════════════════════════

# ❌ db/no-select-star
query1 = "SELECT * FROM users"

# ⚠️ db/leading-wildcard-like
query2 = "SELECT id FROM users WHERE name LIKE '%john%'"

# ❌ db/query-in-loop
def load_orders(ids):
    for user_id in ids:
        q = f"SELECT * FROM orders WHERE user_id = {user_id}"


# ═══════════════════════════════════════════════════════════════
#  PERFORMANCE RULES  (Python only)
# ═══════════════════════════════════════════════════════════════

# ℹ️ py/print-in-production
def process_payment(amount):
    print(f"Processing payment: {amount}")
    return amount * 1.1

# ⚠️ py/new-object-in-loop
def build_payloads(ids):
    for user_id in ids:
        payload = []
        payload.append(user_id)

def build_dicts(ids):
    for user_id in ids:
        result = {}
        result['id'] = user_id


# ═══════════════════════════════════════════════════════════════
#  CODE QUALITY RULES  (Python only)
# ═══════════════════════════════════════════════════════════════

# ⚠️ py/bare-except
def risky_operation_1():
    try:
        result = 1 / 0
    except:
        pass

# ❌ py/mutable-default-arg  (×3 variants)
def add_item(item, items=[]):
    items.append(item)
    return items

def merge_config(key, config={}):
    config[key] = True
    return config

def collect(value, accumulator=()):
    return accumulator + (value,)

# ⚠️ py/broad-exception-catch  (×2 variants)
def broad_catch_1():
    try:
        risky_operation_1()
    except Exception:
        pass

def broad_catch_2():
    try:
        risky_operation_1()
    except Exception as e:
        logging.error(e)

# ⚠️ py/assert-in-production
def validate_age(age):
    assert age >= 0
    assert age < 150
    return True

def validate_config(cfg):
    assert cfg is not None
    assert 'db_host' in cfg


# ═══════════════════════════════════════════════════════════════
#  SECURITY RULES  (Python only)
# ═══════════════════════════════════════════════════════════════

# ❌ security/hardcoded-secret  (all-languages rule fires too)
api_key = "sk-abc123supersecret"
db_password = "mypassword123"

# ❌ py/eval-usage
def run_user_code(code_string):
    return eval(code_string)

# ❌ py/exec-usage
def execute_script(script):
    exec(script)

# ❌ py/shell-true  (×2 variants)
def run_command_unsafe(cmd):
    subprocess.run(cmd, shell=True)

def check_output_unsafe(cmd):
    return subprocess.check_output(cmd, shell=True)


# ═══════════════════════════════════════════════════════════════
#  AST RULES  (Python AST engine — requires Python 3.8+)
# ═══════════════════════════════════════════════════════════════

# ⚠️ py/ast-function-too-long
# This function exceeds the default 30-line threshold
def function_that_is_too_long(a, b, c):
    x1  = a + 1
    x2  = b + 2
    x3  = c + 3
    x4  = x1 + x2
    x5  = x2 + x3
    x6  = x3 + x4
    x7  = x4 + x5
    x8  = x5 + x6
    x9  = x6 + x7
    x10 = x7 + x8
    x11 = x8 + x9
    x12 = x9 + x10
    x13 = x10 + x11
    x14 = x11 + x12
    x15 = x12 + x13
    x16 = x13 + x14
    x17 = x14 + x15
    x18 = x15 + x16
    x19 = x16 + x17
    x20 = x17 + x18
    x21 = x18 + x19
    x22 = x19 + x20
    x23 = x20 + x21
    x24 = x21 + x22
    x25 = x22 + x23
    x26 = x23 + x24
    x27 = x24 + x25
    x28 = x25 + x26
    x29 = x26 + x27
    x30 = x27 + x28
    return x30


# ⚠️ py/ast-class-too-many-methods
# This class has 12 methods — exceeds the default threshold of 10
class ClassWithTooManyMethods:
    def method_one(self):   pass
    def method_two(self):   pass
    def method_three(self): pass
    def method_four(self):  pass
    def method_five(self):  pass
    def method_six(self):   pass
    def method_seven(self): pass
    def method_eight(self): pass
    def method_nine(self):  pass
    def method_ten(self):   pass
    def method_eleven(self): pass
    def method_twelve(self): pass


# 💡 py/ast-missing-docstring
# These functions and class have no docstring
def function_without_docstring(x, y):
    return x + y

class ClassWithoutDocstring:
    def public_method(self, x):
        return x


# 💡 py/ast-no-type-hints
# These functions have no parameter or return type annotations
def function_without_type_hints(name, age, active):
    return f"{name} is {age}"

def another_no_hints(items, limit):
    return items[:limit]


# ⚠️ py/ast-init-too-complex
# This __init__ assigns more than 8 instance variables
class ClassWithComplexInit:
    """A class whose init assigns too many instance variables."""

    def __init__(self, data):
        self.name      = data.get('name')
        self.age       = data.get('age')
        self.email     = data.get('email')
        self.address   = data.get('address')
        self.phone     = data.get('phone')
        self.role      = data.get('role')
        self.team      = data.get('team')
        self.region    = data.get('region')
        self.is_active = data.get('is_active', True)


# ═══════════════════════════════════════════════════════════════
#  CLEAN — should NOT trigger any rules
# ═══════════════════════════════════════════════════════════════

# ✅ Specific exception type
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError as e:
        logging.error("Division by zero: %s", e)
        return None

# ✅ No mutable default — uses None sentinel
def add_item_safe(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

# ✅ subprocess without shell=True
def run_command_safe(cmd_list):
    return subprocess.run(cmd_list, capture_output=True, text=True)

# ✅ logging instead of print
def process_order(order_id):
    logging.info("Processing order: %s", order_id)
    return order_id

# ✅ Explicit if/raise instead of assert
def validate_user_id(user_id):
    if user_id is None:
        raise ValueError("user_id cannot be None")
    if user_id <= 0:
        raise ValueError(f"user_id must be positive, got {user_id}")
    return True

# ✅ Clean AST — typed, docstring, short, small class, simple init
def clean_function(name: str, age: int) -> str:
    """Returns a formatted greeting string."""
    return f"Hello {name}, age {age}"

class CleanClass:
    """A small focused class that does one thing."""

    def __init__(self, name: str):
        self.name = name

    def greet(self) -> str:
        """Returns a greeting."""
        return f"Hello {self.name}"

# ✅ No bare except — commented out lines should not trigger
# except:              ← commented, should be ignored
# eval("test")         ← commented, should be ignored
# exec("test")         ← commented, should be ignored