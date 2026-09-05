import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import {
  getCookie,
  getUserSession,
  saveUserSession,
  setCookie,
} from "../lib/session";

describe("session helpers", () => {
  const store = new Map<string, string>();
  let cookieStr = "";

  beforeAll(() => {
    // Mock browser storage and document for test environment
    const mockStorage = {
      clear: () => {
        store.clear();
      },
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => {
        store.delete(k);
      },
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };

    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockStorage,
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage =
      mockStorage;

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return cookieStr;
        },
        set cookie(v: string) {
          const [pair] = v.split(";");
          if (pair) {
            const [k, val] = pair.split("=");
            if (k && val !== undefined) {
              cookieStr = `${k.trim()}=${val.trim()}`;
            }
          }
        },
      },
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "document");
  });

  beforeEach(() => {
    store.clear();
    cookieStr = "";
  });

  test("cookie set and get", () => {
    setCookie("test_key", "test_value");
    expect(getCookie("test_key")).toBe("test_value");
    expect(getCookie("non_existent")).toBeNull();
  });

  test("getUserSession returns empty when nothing stored", () => {
    const s = getUserSession();
    expect(s.hasSession).toBe(false);
    expect(s.name).toBe("");
    expect(s.email).toBe("");
  });

  test("saveUserSession persists to localStorage and cookies", () => {
    saveUserSession("Ada Lovelace", "ada@analytical.engine");
    const s = getUserSession();
    expect(s.hasSession).toBe(true);
    expect(s.name).toBe("Ada Lovelace");
    expect(s.email).toBe("ada@analytical.engine");
    expect(store.get("nebula_user_name")).toBe("Ada Lovelace");
    expect(store.get("nebula_user_email")).toBe("ada@analytical.engine");
  });

  test("getUserSession detects partial session as hasSession=false", () => {
    store.set("nebula_user_name", "Only Name");
    const s = getUserSession();
    expect(s.name).toBe("Only Name");
    expect(s.email).toBe("");
    expect(s.hasSession).toBe(false);
  });
});
