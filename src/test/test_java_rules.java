// ─────────────────────────────────────────────────────────────────────
//  ScaleArch — Test File  (Java)
//  Open this in the Extension Development Host to verify all
//  Java regex rules fire correctly.
//
//  Each section lists the rule ID and expected severity icon:
//    ❌ Error  ⚠️ Warning  ℹ️ Info
//
//  NOTE: This is a test file only — it won't compile as-is.
//  It is written purely to trigger ScaleArch squiggly lines.
// ─────────────────────────────────────────────────────────────────────

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;


// ═══════════════════════════════════════════════════════════════
//  DATABASE RULES  (regex engine — all languages)
// ═══════════════════════════════════════════════════════════════

public class DatabaseExamples {

    // ❌ db/no-select-star
    String q1 = "SELECT * FROM users";

    // ⚠️ db/leading-wildcard-like
    String q2 = "SELECT id FROM users WHERE name LIKE '%john%'";

    // ❌ db/query-in-loop
    public void loadOrders(int[] ids) {
        for (int id : ids) {
            String query = "SELECT * FROM orders WHERE user_id = " + id;
        }
    }
}


// ═══════════════════════════════════════════════════════════════
//  PERFORMANCE RULES  (Java only)
// ═══════════════════════════════════════════════════════════════

public class PerformanceExamples {

    // ℹ️ java/system-out-println  (×2)
    public void debugMethod() {
        System.out.println("Starting process");
        System.out.print("Value: ");
    }

    // ⚠️ java/string-concat-in-loop
    public String buildReport(String[] items) {
        String result = "";
        for (String item : items) {
            result += item + ", ";
        }
        return result;
    }

    public String buildSummary(List<String> names) {
        String output = "";
        while (!names.isEmpty()) {
            output += names.remove(0);
        }
        return output;
    }

    // ⚠️ java/new-object-in-loop
    public void processItems(int[] ids) {
        for (int id : ids) {
            List<String> temp = new ArrayList<>();
            temp.add(String.valueOf(id));
        }
    }

    public void buildMaps(String[] keys) {
        for (String key : keys) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("key", key);
        }
    }
}


// ═══════════════════════════════════════════════════════════════
//  CODE QUALITY RULES  (Java only)
// ═══════════════════════════════════════════════════════════════

public class CodeQualityExamples {

    // ⚠️ java/empty-catch  (×2)
    public void silentCatch1() {
        try {
            riskyOperation();
        } catch (Exception e) {
        }
    }

    public void silentCatch2() {
        try {
            anotherOp();
        } catch (IOException e) {
        }
    }

    // ⚠️ java/catch-generic-exception  (×2)
    public void broadCatch1() {
        try {
            riskyOperation();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void broadCatch2() {
        try {
            anotherOp();
        } catch (Exception ex) {
            logger.error("Error", ex);
        }
    }

    // ⚠️ java/raw-types  (×3 — no generic parameter)
    List rawList = new ArrayList();
    Map  rawMap  = new HashMap();
    Set  rawSet  = new HashSet();
}


// ═══════════════════════════════════════════════════════════════
//  SECURITY RULES  (Java only + all-languages)
// ═══════════════════════════════════════════════════════════════

public class SecurityExamples {

    // ❌ security/hardcoded-secret  (all-languages rule)
    // ❌ java/hardcoded-secret  (Java rule)
    String apiKey   = "sk-abc123supersecret";
    String password = "mypassword123";

    // ❌ java/sql-concatenation  (×2 variants)
    public String buildQuery1(String username) {
        return "SELECT * FROM users WHERE username = '" + username + "'";
    }

    public void runQuery(Connection conn, String userId) throws Exception {
        String sql = "DELETE FROM sessions " + userId + " WHERE active = true";
        conn.createStatement().execute(sql);
    }
}


// ═══════════════════════════════════════════════════════════════
//  CLEAN — should NOT trigger any rules
// ═══════════════════════════════════════════════════════════════

public class CleanExamples {

    // ✅ Specific exception type with logging
    public void safeCatch() {
        try {
            riskyOperation();
        } catch (IOException e) {
            logger.error("IO failed", e);
        }
    }

    // ✅ Generic types used correctly
    List<String>         typedList = new ArrayList<>();
    Map<String, Integer> typedMap  = new HashMap<>();

    // ✅ PreparedStatement — no injection risk
    public void safeQuery(Connection conn, String username) throws Exception {
        PreparedStatement ps = conn.prepareStatement(
            "SELECT id, name FROM users WHERE username = ?"
        );
        ps.setString(1, username);
        ps.executeQuery();
    }

    // ✅ StringBuilder in loop — not string concat
    public String buildReport(String[] items) {
        StringBuilder sb = new StringBuilder();
        for (String item : items) {
            sb.append(item).append(", ");
        }
        return sb.toString();
    }

    // ✅ Logger — not System.out
    private static final Logger logger = LoggerFactory.getLogger(CleanExamples.class);

    public void logSomething() {
        logger.info("Processing started");
        logger.debug("Debug value: {}", 42);
    }
}
