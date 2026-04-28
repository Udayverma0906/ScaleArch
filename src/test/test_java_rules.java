package test;

// ─────────────────────────────────────────────────────────────────────────────
//  ScaleArch — Java Rules Test File
//
//  Tests BOTH regex engine rules AND AST engine rules.
//  Open in Extension Development Host to verify squiggles.
//
//  Severity legend:
//    ❌ Error   ⚠️ Warning   ℹ️ Info   💡 Hint
//
//  NOTE: This file is intentionally bad code — written to trigger rules.
// ─────────────────────────────────────────────────────────────────────────────

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;


// ═════════════════════════════════════════════════════════════════════════════
//  DATABASE RULES  (regex engine)
// ═════════════════════════════════════════════════════════════════════════════

class DatabaseExamples {

    // ❌ db/no-select-star
    String q1 = "SELECT * FROM users";

    // ⚠️ db/leading-wildcard-like
    String q2 = "SELECT id FROM users WHERE name LIKE '%john%'";

    // ❌ db/query-in-loop — SELECT inside a for loop
    public void loadOrders(int[] ids) {
        for (int id : ids) {
            String query = "SELECT * FROM orders WHERE user_id = " + id;
        }
    }

    // ❌ db/delete-without-where
    String q3 = "DELETE FROM sessions";

    // ✅ NEGATIVE — specific columns, WHERE clause
    String q4 = "SELECT id, name FROM users WHERE id = ?";
}


// ═════════════════════════════════════════════════════════════════════════════
//  PERFORMANCE RULES  (regex engine — Java only)
// ═════════════════════════════════════════════════════════════════════════════

class PerformanceExamples {

    // ℹ️ java/system-out-println
    public void debugMethod() {
        System.out.println("Starting process");
        System.out.print("Value: ");
    }

    // ⚠️ java/string-concat-in-loop — += inside for
    public String buildReport(String[] items) {
        String result = "";
        for (String item : items) {
            result += item + ", ";
        }
        return result;
    }

    // ⚠️ java/string-concat-in-loop — += inside while
    public String buildSummary(List<String> names) {
        String output = "";
        while (!names.isEmpty()) {
            output += names.remove(0);
        }
        return output;
    }

    // ⚠️ java/new-object-in-loop — new inside for
    public void processItems(int[] ids) {
        for (int id : ids) {
            List<String> temp = new ArrayList<>();
            temp.add(String.valueOf(id));
        }
    }

    // ✅ NEGATIVE — StringBuilder in loop
    public String buildReportClean(String[] items) {
        StringBuilder sb = new StringBuilder();
        for (String item : items) {
            sb.append(item).append(", ");
        }
        return sb.toString();
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  CODE QUALITY RULES  (regex engine — Java only)
// ═════════════════════════════════════════════════════════════════════════════

@SuppressWarnings({"rawtypes"})
class CodeQualityExamples {

    private void riskyOperation() throws Exception {}

    // ⚠️ java/catch-generic-exception
    public void broadCatch() {
        try {
            riskyOperation();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ⚠️ java/raw-types — no generic parameter (intentional — ScaleArch test)
    List rawList = new ArrayList();
    Map  rawMap  = new HashMap();

    // ✅ NEGATIVE — typed generics
    List<String>         typedList = new ArrayList<>();
    Map<String, Integer> typedMap  = new HashMap<>();
}


// ═════════════════════════════════════════════════════════════════════════════
//  SECURITY RULES  (regex engine)
// ═════════════════════════════════════════════════════════════════════════════

class SecurityExamples {

    // ❌ security/hardcoded-secret
    String apiKey   = "sk-abc123supersecretkey";
    String password = "mypassword123";

    // ❌ java/sql-concatenation — string concat in SQL
    public String buildQuery(String username) {
        return "SELECT * FROM users WHERE username = '" + username + "'";
    }

    public void runQuery(Connection conn, String userId) throws Exception {
        String sql = "DELETE FROM sessions WHERE user_id = " + userId;
        conn.createStatement().execute(sql);
    }

    // ✅ NEGATIVE — PreparedStatement
    public void safeQuery(Connection conn, String username) throws Exception {
        PreparedStatement ps = conn.prepareStatement(
            "SELECT id, name FROM users WHERE username = ?"
        );
        ps.setString(1, username);
        ps.executeQuery();
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 1: java/ast-method-too-long  (threshold: 40 lines)
// ═════════════════════════════════════════════════════════════════════════════

class MethodLengthExamples {

// ⚠️ POSITIVE — 56 lines, should squiggle
public void methodTooLong() {
    int v01 = 1;
    int v02 = 2;
    int v03 = 3;
    int v04 = 4;
    int v05 = 5;
    int v06 = 6;
    int v07 = 7;
    int v08 = 8;
    int v09 = 9;
    int v10 = 10;

    int v11 = 11;
    int v12 = 12;
    int v13 = 13;
    int v14 = 14;
    int v15 = 15;
    int v16 = 16;
    int v17 = 17;
    int v18 = 18;
    int v19 = 19;
    int v20 = 20;

    int v21 = 21;
    int v22 = 22;
    int v23 = 23;
    int v24 = 24;
    int v25 = 25;
    int v26 = 26;
    int v27 = 27;
    int v28 = 28;
    int v29 = 29;
    int v30 = 30;

    int v31 = 31;
    int v32 = 32;
    int v33 = 33;
    int v34 = 34;
    int v35 = 35;
    int v36 = 36;
    int v37 = 37;
    int v38 = 38;
    int v39 = 39;
    int v40 = 40;

    int v41 = 41;
    int v42 = 42;

    System.out.println(
        v01 + v02 + v03 + v04 + v05 + v06 + v07 + v08 +
        v09 + v10 + v11 + v12 + v13 + v14 + v15 + v16 +
        v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 +
        v25 + v26 + v27 + v28 + v29 + v30 + v31 + v32 +
        v33 + v34 + v35 + v36 + v37 + v38 + v39 + v40 +
        v41 + v42
    );
}

    // ✅ NEGATIVE — short method
    public void shortMethod() {
        System.out.println("short");
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 2: java/ast-class-too-many-methods  (threshold: 10)
// ═════════════════════════════════════════════════════════════════════════════

// ⚠️ POSITIVE — 11 methods
class BigClass {
    public void m1()  { System.out.println(1);  }
    public void m2()  { System.out.println(2);  }
    public void m3()  { System.out.println(3);  }
    public void m4()  { System.out.println(4);  }
    public void m5()  { System.out.println(5);  }
    public void m6()  { System.out.println(6);  }
    public void m7()  { System.out.println(7);  }
    public void m8()  { System.out.println(8);  }
    public void m9()  { System.out.println(9);  }
    public void m10() { System.out.println(10); }
    public void m11() { System.out.println(11); }
}

// ✅ NEGATIVE — 3 methods
class SmallClass {
    public void doA() { System.out.println("A"); }
    public void doB() { System.out.println("B"); }
    public void doC() { System.out.println("C"); }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 3: java/ast-too-many-params  (threshold: 4)
//  AST RULE 4: java/ast-empty-catch
// ═════════════════════════════════════════════════════════════════════════════

class AstMiscExamples {

    // ── Rule 3 ────────────────────────────────────────────────────────────────
    // ⚠️ POSITIVE — 5 params
    public void tooManyParams(String a, String b, String c, String d, String e) {
        System.out.println(a + b + c + d + e);
    }

    // ✅ NEGATIVE — 2 params
    public void fewParams(String name, int age) {
        System.out.println(name + age);
    }

    // ── Rule 4 ────────────────────────────────────────────────────────────────
    // ❌ POSITIVE — empty catch body
    public void emptyCatch() {
        try {
            int x = 10 / 0;
        } catch (Exception e) {
        }
    }

    // ✅ NEGATIVE — catch has body
    public void catchWithBody() {
        try {
            int x = 10 / 0;
        } catch (Exception e) {
            System.err.println(e.getMessage());
        }
    }

    // ✅ NEGATIVE — private method
    private void privateMethod() {
        System.out.println("private");
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 5: java/ast-public-field
// ═════════════════════════════════════════════════════════════════════════════

class PublicFieldExamples {

    // ⚠️ POSITIVE — public mutable fields
    public String name;
    public int count;
    public List<String> items;

    // ✅ NEGATIVE — public static final constants
    public static final int MAX_SIZE = 100;
    public static final String VERSION = "1.0.0";

    // ✅ NEGATIVE — private fields
    private String internalState;
    private int balance;
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 6: java/ast-deep-nesting  (threshold: 3 levels)
// ═════════════════════════════════════════════════════════════════════════════

class DeepNestingExamples {

    // ⚠️ POSITIVE — 4 levels deep
    public void deeplyNested(int a, int b, int c, int d) {
        if (a > 0) {
            for (int i = 0; i < b; i++) {
                while (c > 0) {
                    if (d > 0) {   // ← level 4, should squiggle
                        System.out.println("deep");
                    }
                    c--;
                }
            }
        }
    }

    // ✅ NEGATIVE — 2 levels deep
    public void shallowNested(int a, int b) {
        if (a > 0) {
            for (int i = 0; i < b; i++) {
                System.out.println(i);
            }
        }
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 7: java/ast-too-many-fields  (threshold: 8)
// ═════════════════════════════════════════════════════════════════════════════

// ⚠️ POSITIVE — 9 fields
class GodObject {
    private String name;
    private int age;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;
    private String zipCode;
    private String notes;    // ← 9th field, should squiggle on class
}

// ✅ NEGATIVE — 3 fields
class LeanObject {
    private String name;
    private int age;
    private String email;
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 8: java/ast-magic-number
// ═════════════════════════════════════════════════════════════════════════════

class MagicNumberExamples {

    // ℹ️ POSITIVE — magic numbers in logic
    public double calculateTax(double income) {
        if (income > 50000) {          // ← magic number
            return income * 0.30;      // ← magic number
        }
        return income * 0.15;          // ← magic number
    }

    // ✅ NEGATIVE — named constants
    private static final double HIGH_RATE    = 0.30;
    private static final double LOW_RATE     = 0.15;
    private static final double THRESHOLD    = 50000;

    public double calculateTaxClean(double income) {
        if (income > THRESHOLD) {
            return income * HIGH_RATE;
        }
        return income * LOW_RATE;
    }

    // ✅ NEGATIVE — 0 and 1 are always skipped
    public int increment(int x) {
        return x + 1;
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 9: java/ast-interface-too-large  (threshold: 5 methods)
// ═════════════════════════════════════════════════════════════════════════════

// ⚠️ POSITIVE — 6 methods, ISP violation
interface FatInterface {
    void save();
    void delete();
    void update();
    void find();
    void list();
    void export();   // ← 6th method, should squiggle on interface
}

// ✅ NEGATIVE — 2 methods
interface LeanInterface {
    void save();
    void delete();
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 10: java/ast-system-exit
// ═════════════════════════════════════════════════════════════════════════════

class SystemExitExamples {

    // ❌ POSITIVE — System.exit() outside main
    public void shutdown() {
        System.exit(0);   // ← should squiggle
    }

    // ✅ NEGATIVE — System.exit() inside main() is allowed
    public static void main(String[] args) {
        System.exit(0);   // ← no squiggle
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 11: java/ast-thread-sleep
// ═════════════════════════════════════════════════════════════════════════════

class ThreadSleepExamples {

    // ⚠️ POSITIVE — Thread.sleep() in production code
    public void pollForResult() throws InterruptedException {
        while (true) {
            Thread.sleep(1000);   // ← should squiggle
            checkResult();
        }
    }

    private void checkResult() {}
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 12: java/ast-string-equals-compare
// ═════════════════════════════════════════════════════════════════════════════

class StringCompareExamples {

    // ❌ POSITIVE — == with string literal
    public boolean checkStatus(String status) {
        return status == "active";     // ← should squiggle
    }

    // ❌ POSITIVE — != with string literal
    public boolean isNotAdmin(String role) {
        return role != "admin";        // ← should squiggle
    }

    // ✅ NEGATIVE — .equals() is correct
    public boolean checkStatusClean(String status) {
        return "active".equals(status);
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 13: java/ast-constructor-too-many-params  (threshold: 4)
// ═════════════════════════════════════════════════════════════════════════════

class ConstructorParamExamples {

    // ⚠️ POSITIVE — 5 params in constructor
    public ConstructorParamExamples(String name, int age, String email,
                                    String phone, String address) {
        // telescoping constructor — should squiggle
    }
}

class CleanConstructor {

    // ✅ NEGATIVE — 2 params
    public CleanConstructor(String name, int age) {}
}

// ── custom/java-no-sysout ─────────────────────────────────────────────────
// ℹ️ POSITIVE — should squiggle
class CustomRuleExamples {
    public void process() {
        System.out.println("Processing started");   // ← squiggle
        System.err.println("Something failed");     // ← squiggle
    }

    // ✅ NEGATIVE — logger is fine
    public void processClean() {
        logger.info("Processing started");
        logger.error("Something failed");
    }
}