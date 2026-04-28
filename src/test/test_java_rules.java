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
//        It will not compile. That's expected.
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

    // stub — exists only so riskyOperation() resolves
    private void riskyOperation() throws Exception {}

    // ⚠️ java/catch-generic-exception
    public void broadCatch() {
        try {
            riskyOperation();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ⚠️ java/raw-types — no generic parameter
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

    // ⚠️ POSITIVE — method body spans > 40 lines
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
        System.out.println(v01 + v02 + v03 + v04 + v05);
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
//  AST RULE 5: java/ast-missing-javadoc
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

    // ✅ NEGATIVE — private, rule skips non-public methods
    private void privateMethod() {
        System.out.println("private");
    }
}


// ═════════════════════════════════════════════════════════════════════════════
//  AST RULE 5: java/ast-public-field
//  Flags public non-final instance fields — breaks encapsulation
// ═════════════════════════════════════════════════════════════════════════════

class PublicFieldExamples {

    // ⚠️ POSITIVE — public mutable field, should squiggle
    public String name;
    public int count;
    public List<String> items;

    // ✅ NEGATIVE — public static final constant is fine
    public static final int MAX_SIZE = 100;
    public static final String VERSION = "1.0.0";

    // ✅ NEGATIVE — private field, no squiggle
    private String internalState;
    private int balance;
}