// ─────────────────────────────────────────────────────────────────────
//  ScaleArch — Test File  (C / C++)
//  Open this in the Extension Development Host to verify all
//  C/C++ regex rules fire correctly.
//
//  Each section lists the rule ID and expected severity icon:
//    ❌ Error  ⚠️ Warning  ℹ️ Info
//
//  NOTE: This is a test file only — written to trigger ScaleArch
//  squiggly lines, not necessarily to compile cleanly.
// ─────────────────────────────────────────────────────────────────────

#include <iostream>
#include <string>
#include <memory>
#include <cstdio>
#include <cstring>


// ═══════════════════════════════════════════════════════════════
//  DATABASE RULES  (regex engine — all languages)
// ═══════════════════════════════════════════════════════════════

// ❌ db/no-select-star
const char* q1 = "SELECT * FROM users";

// ⚠️ db/leading-wildcard-like
const char* q2 = "SELECT id FROM users WHERE name LIKE '%john%'";


// ═══════════════════════════════════════════════════════════════
//  PERFORMANCE RULES  (C/C++ only)
// ═══════════════════════════════════════════════════════════════

// ℹ️ cpp/cout-in-production  (×2)
void debugOutput() {
    std::cout << "Starting process" << std::endl;
    cout << "Value: " << 42 << std::endl;
}

// ℹ️ cpp/printf-in-production  (×2)
void debugPrintf() {
    printf("Hello %s\n", "world");
    printf("Count: %d\n", 42);
}


// ═══════════════════════════════════════════════════════════════
//  CODE QUALITY RULES  (C/C++ only)
// ═══════════════════════════════════════════════════════════════

// ⚠️ cpp/raw-new-without-delete  (×3)
void rawNewExamples() {
    int* p1 = new int(42);
    std::string* p2 = new std::string("hello");
    MyClass* obj = new MyClass();
}

// ⚠️ cpp/raw-delete  (×2)
void rawDeleteExamples(int* ptr, MyClass* obj) {
    delete ptr;
    delete obj;
}

// ⚠️ cpp/define-instead-of-const  (×3)
#define MAX_BUFFER_SIZE 1024
#define MAX_CONNECTIONS 100
#define ERROR_MESSAGE "Something went wrong"

// ⚠️ cpp/using-namespace-std  (×1 — in global scope, worst offender)
using namespace std;

// ⚠️ cpp/c-style-cast  (×3)
void cStyleCasts() {
    double d = 3.14;
    int    i = (int) d;

    const char* str = "hello";
    char* mutable_str = (char*) str;

    void* ptr = malloc(100);
    int*  int_ptr = (int*) ptr;
}


// ═══════════════════════════════════════════════════════════════
//  SECURITY RULES  (C/C++ only)
// ═══════════════════════════════════════════════════════════════

// ❌ security/hardcoded-secret  (all-languages rule fires too)
const char* api_key  = "sk-abc123supersecret";
const char* password = "mypassword123";

// ❌ cpp/gets-usage
void readInput() {
    char buf[256];
    gets(buf);
}

// ⚠️ cpp/strcpy-usage  (×2)
void copyStrings() {
    char dest[100];
    strcpy(dest, "hello world");

    char name[50];
    strcpy(name, username);
}

// ⚠️ cpp/sprintf-usage  (×2 — note: snprintf should NOT trigger)
void formatStrings() {
    char buf[256];
    sprintf(buf, "Hello %s, you are %d years old", name, age);

    char msg[128];
    sprintf(msg, "Error code: %d", error_code);
}


// ═══════════════════════════════════════════════════════════════
//  CLEAN — should NOT trigger any rules
// ═══════════════════════════════════════════════════════════════

// ✅ Smart pointer — no raw new
void smartPointers() {
    auto p1 = std::make_unique<int>(42);
    auto p2 = std::make_shared<std::string>("hello");
    auto obj = std::make_unique<MyClass>();
}

// ✅ constexpr instead of #define
constexpr int  MAX_SIZE    = 1024;
constexpr int  MAX_CONN    = 100;
const std::string ERR_MSG  = "Something went wrong";

// ✅ Named casts instead of C-style
void namedCasts() {
    double d = 3.14;
    int    i = static_cast<int>(d);

    Base* b  = getBase();
    Derived* d2 = dynamic_cast<Derived*>(b);
}

// ✅ snprintf — bounds-checked, should NOT trigger sprintf rule
void safeFormat() {
    char buf[256];
    snprintf(buf, sizeof(buf), "Hello %s", name);
}

// ✅ strncpy — bounds-checked, should NOT trigger strcpy rule
void safeCopy() {
    char dest[100];
    strncpy(dest, source, sizeof(dest) - 1);
    dest[sizeof(dest) - 1] = '\0';
}

// ✅ Specific using declarations — not "using namespace std"
// using std::cout;   ← this would be fine (not blocked)
// using std::string; ← this too

// ✅ Commented-out dangerous code should NOT trigger
// cout << "debug";    ← commented, ignore
// printf("debug");    ← commented, ignore
// gets(buf);          ← commented, ignore
