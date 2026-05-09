import { afterEach, describe, expect, it } from "bun:test";
import {
    DARK_SCHEME_QUERY,
    DARK_THEME_COLOR,
    LIGHT_THEME_COLOR,
    THEME_STORAGE_KEY,
    getResolvedTheme,
    getThemePreference,
    initializeTheme,
    setThemePreference,
    subscribeTheme,
} from "../../source/theme";


// Test Doubles

class MemoryStorage implements Storage {
    private readonly values = new Map<string, string>();

    get length() { return this.values.size; }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return Array.from(this.values.keys())[index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, value);
    }
}

class BlockedStorage extends MemoryStorage {
    override getItem(_key: string): string | null {
        throw new Error("blocked");
    }

    override removeItem(_key: string) {
        throw new Error("blocked");
    }

    override setItem(_key: string, _value: string) {
        throw new Error("blocked");
    }
}

const makeDocument = () => {
    const meta = {
        content: LIGHT_THEME_COLOR,
        setAttribute(name: string, value: string) {
            if (name === "content") this.content = value;
        },
        getAttribute(name: string) {
            return name === "content" ? this.content : null;
        },
    };

    return {
        documentElement: {
            dataset: {} as Record<string, string>,
            style: {} as CSSStyleDeclaration,
        },
        meta,
        querySelector(selector: string) {
            return selector === 'meta[name="theme-color"]' ? meta : null;
        },
    } as unknown as Document & { meta: typeof meta };
};

type SystemListenerApi = "modern" | "legacy" | "none";

const makeSystemTheme = (initialMatches: boolean, listenerApi: SystemListenerApi = "modern") => {
    let matches = initialMatches;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query: Record<string, unknown> = {};

    if (listenerApi === "modern") {
        query.addEventListener = (_type: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.add(listener);
        };
        query.removeEventListener = (_type: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.delete(listener);
        };
    }

    if (listenerApi === "legacy") {
        query.addListener = (listener: (event: MediaQueryListEvent) => void) => {
            listeners.add(listener);
        };
        query.removeListener = (listener: (event: MediaQueryListEvent) => void) => {
            listeners.delete(listener);
        };
    }

    Object.defineProperty(query, "matches", {
        get() { return matches; },
    });

    return {
        matchMedia: () => query as unknown as MediaQueryList,
        listenerCount: () => listeners.size,
        setMatches(nextMatches: boolean) {
            matches = nextMatches;
            listeners.forEach((listener) => {
                listener({ matches: nextMatches } as MediaQueryListEvent);
            });
        },
    };
};

afterEach(() => {
    initializeTheme({});
});


// Runtime Theme State

describe("theme runtime", () => {
    it("defaults absent storage to System with a light resolved theme", () => {
        const document = makeDocument();
        const storage = new MemoryStorage();
        const systemTheme = makeSystemTheme(false);

        initializeTheme({ document, storage, matchMedia: systemTheme.matchMedia });

        expect(getThemePreference()).toBe("system");
        expect(getResolvedTheme()).toBe("light");
        expect(document.documentElement.dataset.theme).toBe("light");
        expect(document.documentElement.style.colorScheme).toBe("light");
        expect(document.meta.getAttribute("content")).toBe(LIGHT_THEME_COLOR);
        expect(systemTheme.listenerCount()).toBe(1);
    });

    it("follows system changes while preference is System", () => {
        const document = makeDocument();
        const storage = new MemoryStorage();
        const systemTheme = makeSystemTheme(true);
        let notifications = 0;

        initializeTheme({ document, storage, matchMedia: systemTheme.matchMedia });
        const unsubscribe = subscribeTheme(() => { notifications += 1; });
        systemTheme.setMatches(false);

        expect(getThemePreference()).toBe("system");
        expect(getResolvedTheme()).toBe("light");
        expect(document.documentElement.dataset.theme).toBe("light");
        expect(document.documentElement.style.colorScheme).toBe("light");
        expect(document.meta.getAttribute("content")).toBe(LIGHT_THEME_COLOR);
        expect(notifications).toBe(1);

        unsubscribe();
    });

    it("follows system changes through legacy MediaQueryList listeners", () => {
        const document = makeDocument();
        const storage = new MemoryStorage();
        const systemTheme = makeSystemTheme(false, "legacy");
        let notifications = 0;

        initializeTheme({ document, storage, matchMedia: systemTheme.matchMedia });
        const unsubscribe = subscribeTheme(() => { notifications += 1; });
        systemTheme.setMatches(true);

        expect(getThemePreference()).toBe("system");
        expect(getResolvedTheme()).toBe("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement.style.colorScheme).toBe("dark");
        expect(document.meta.getAttribute("content")).toBe(DARK_THEME_COLOR);
        expect(notifications).toBe(1);

        setThemePreference("light");
        expect(systemTheme.listenerCount()).toBe(0);

        unsubscribe();
    });

    it("does not crash when MediaQueryList exposes no listener API", () => {
        const document = makeDocument();
        const storage = new MemoryStorage();
        const systemTheme = makeSystemTheme(true, "none");

        initializeTheme({ document, storage, matchMedia: systemTheme.matchMedia });
        systemTheme.setMatches(false);
        setThemePreference("light");
        setThemePreference("system");

        expect(getThemePreference()).toBe("system");
        expect(getResolvedTheme()).toBe("light");
        expect(document.documentElement.dataset.theme).toBe("light");
        expect(document.documentElement.style.colorScheme).toBe("light");
        expect(document.meta.getAttribute("content")).toBe(LIGHT_THEME_COLOR);
        expect(systemTheme.listenerCount()).toBe(0);
    });

    it("persists Light and Dark overrides and ignores later system changes", () => {
        const document = makeDocument();
        const storage = new MemoryStorage();
        const systemTheme = makeSystemTheme(false);

        initializeTheme({ document, storage, matchMedia: systemTheme.matchMedia });
        setThemePreference("dark");
        systemTheme.setMatches(false);

        expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
        expect(getThemePreference()).toBe("dark");
        expect(getResolvedTheme()).toBe("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement.style.colorScheme).toBe("dark");
        expect(document.meta.getAttribute("content")).toBe(DARK_THEME_COLOR);
        expect(systemTheme.listenerCount()).toBe(0);

        setThemePreference("light");

        expect(storage.getItem(THEME_STORAGE_KEY)).toBe("light");
        expect(getThemePreference()).toBe("light");
        expect(getResolvedTheme()).toBe("light");
        expect(document.meta.getAttribute("content")).toBe(LIGHT_THEME_COLOR);
    });

    it("removes the override when returning to System", () => {
        const document = makeDocument();
        const storage = new MemoryStorage();
        const systemTheme = makeSystemTheme(true);

        initializeTheme({ document, storage, matchMedia: systemTheme.matchMedia });
        setThemePreference("light");
        setThemePreference("system");

        expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
        expect(getThemePreference()).toBe("system");
        expect(getResolvedTheme()).toBe("dark");
        expect(document.meta.getAttribute("content")).toBe(DARK_THEME_COLOR);
        expect(systemTheme.listenerCount()).toBe(1);
    });

    it("falls back to System for invalid or blocked storage", () => {
        const invalidStorage = new MemoryStorage();
        invalidStorage.setItem(THEME_STORAGE_KEY, "blue");

        initializeTheme({
            document: makeDocument(),
            storage: invalidStorage,
            matchMedia: makeSystemTheme(false).matchMedia,
        });
        expect(getThemePreference()).toBe("system");

        initializeTheme({
            document: makeDocument(),
            storage: new BlockedStorage(),
            matchMedia: makeSystemTheme(true).matchMedia,
        });
        expect(getThemePreference()).toBe("system");
        expect(getResolvedTheme()).toBe("dark");
    });
});


// First Paint Mirror

describe("first-paint script", () => {
    const readInlineScript = async () => {
        const html = await Bun.file("source/index.html").text();
        let inlineScript = "";
        let foundInlineScript = false;
        let captureCurrentScript = false;

        new HTMLRewriter()
            .on("script", {
                element(element) {
                    captureCurrentScript = !foundInlineScript && !element.hasAttribute("src");
                    foundInlineScript ||= captureCurrentScript;
                },
                text(text) {
                    if (captureCurrentScript) inlineScript += text.text;
                },
            })
            .transform(html);

        expect(foundInlineScript).toBe(true);
        return inlineScript;
    };

    const runInlineScript = async ({
        storedPreference,
        systemDark,
        blockedStorage = false,
    }: {
        storedPreference: string | null;
        systemDark: boolean;
        blockedStorage?: boolean;
    }) => {
        const document = makeDocument();
        const storage = {
            getItem(key: string) {
                expect(key).toBe(THEME_STORAGE_KEY);
                if (blockedStorage) throw new Error("blocked");
                return storedPreference;
            },
        };
        const globals = {
            matchMedia(query: string) {
                expect(query).toBe(DARK_SCHEME_QUERY);
                return { matches: systemDark };
            },
        };

        new Function("document", "localStorage", "globalThis", await readInlineScript())(
            document,
            storage,
            globals,
        );

        return document;
    };

    it("keeps inline constants mirrored with the runtime theme constants", async () => {
        const html = await Bun.file("source/index.html").text();

        expect(html).toContain(`const storageKey = "${THEME_STORAGE_KEY}"`);
        expect(html).toContain(`const lightThemeColor = "${LIGHT_THEME_COLOR}"`);
        expect(html).toContain(`const darkThemeColor = "${DARK_THEME_COLOR}"`);
        expect(html).toContain(`matchMedia?.("${DARK_SCHEME_QUERY}")`);
        expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('<link href="index.css"'));
    });

    it("applies stored Dark before CSS loads", async () => {
        const document = await runInlineScript({
            storedPreference: "dark",
            systemDark: false,
        });

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement.style.colorScheme).toBe("dark");
        expect(document.meta.getAttribute("content")).toBe(DARK_THEME_COLOR);
    });

    it("applies stored Light before CSS loads even when the OS is dark", async () => {
        const document = await runInlineScript({
            storedPreference: "light",
            systemDark: true,
        });

        expect(document.documentElement.dataset.theme).toBe("light");
        expect(document.documentElement.style.colorScheme).toBe("light");
        expect(document.meta.getAttribute("content")).toBe(LIGHT_THEME_COLOR);
    });

    it("falls back to System when storage contains an invalid value", async () => {
        const document = await runInlineScript({
            storedPreference: "blue",
            systemDark: true,
        });

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement.style.colorScheme).toBe("dark");
        expect(document.meta.getAttribute("content")).toBe(DARK_THEME_COLOR);
    });

    it("falls back to System when storage is blocked", async () => {
        const document = await runInlineScript({
            storedPreference: null,
            systemDark: false,
            blockedStorage: true,
        });

        expect(document.documentElement.dataset.theme).toBe("light");
        expect(document.documentElement.style.colorScheme).toBe("light");
        expect(document.meta.getAttribute("content")).toBe(LIGHT_THEME_COLOR);
    });
});
