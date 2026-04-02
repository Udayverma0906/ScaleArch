# ─────────────────────────────────────────────────────────────────────
#  ScaleArch — Test File  (Python)
#  Open a .py file in the Extension Development Host to verify all
#  Python regex rules fire correctly.
#
#  Each section lists the rule ID and expected severity icon:
#    ❌ Error  ⚠️ Warning  ℹ️ Info
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

# ✅ No bare except — commented out lines should not trigger
# except:  ← this line is commented, should be ignored
# eval("test")  ← this too
