export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "grolleg.theme";
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export const LIGHT_THEME_COLOR = "#386B8C";
export const DARK_THEME_COLOR = "#1E211D";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

interface ThemeEnvironment {
    document?: Document;
    storage?: Storage;
    matchMedia?: (query: string) => MediaQueryList;
}

type ThemeListener = () => void;
interface ApplyPreferenceOptions {
    persist: boolean;
}


// Runtime State

let environment: ThemeEnvironment = {};
let preference: ThemePreference = "system";
let resolvedTheme: ResolvedTheme = "light";
let systemQuery: MediaQueryList | undefined;
let systemQueryHandler: ((event: MediaQueryListEvent) => void) | undefined;

const listeners = new Set<ThemeListener>();


// Environment and Storage

const defaultStorage = (): Storage | undefined => {
    try {
        return globalThis.localStorage;
    } catch {
        return undefined;
    }
};

const defaultEnvironment = (): ThemeEnvironment => ({
    document: globalThis.document,
    storage: defaultStorage(),
    matchMedia: globalThis.matchMedia?.bind(globalThis),
});

const isThemePreference = (value: string | null): value is ThemePreference =>
    value === "system" || value === "light" || value === "dark";

// Invalid, blocked, or absent storage should fall back to System.
const readStoredPreference = ({ storage }: ThemeEnvironment): ThemePreference => {
    try {
        const storedPreference = storage?.getItem(THEME_STORAGE_KEY) ?? null;
        return isThemePreference(storedPreference) ? storedPreference : "system";
    } catch {
        return "system";
    }
};

// Light and Dark should persist as overrides. System should remove storage.
const writeStoredPreference = (nextPreference: ThemePreference, { storage }: ThemeEnvironment) => {
    try {
        if (nextPreference === "system") {
            storage?.removeItem(THEME_STORAGE_KEY);
            return;
        }

        storage?.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
        // Blocked storage should not block the visible theme choice.
    }
};


// Theme Resolution

const resolveSystemTheme = ({ matchMedia }: ThemeEnvironment): ResolvedTheme =>
    matchMedia?.(DARK_SCHEME_QUERY)?.matches ? "dark" : "light";

const resolveTheme = (nextPreference: ThemePreference, nextEnvironment: ThemeEnvironment): ResolvedTheme =>
    nextPreference === "system" ? resolveSystemTheme(nextEnvironment) : nextPreference;

const themeColor = (nextResolvedTheme: ResolvedTheme): string =>
    nextResolvedTheme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;


// Document Application

const applyThemeToDocument = (nextResolvedTheme: ResolvedTheme, { document }: ThemeEnvironment) => {
    if (!document) return;
    document.documentElement.dataset.theme = nextResolvedTheme;
    document.documentElement.style.colorScheme = nextResolvedTheme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute("content", themeColor(nextResolvedTheme));
};

const notifyListeners = () => {
    listeners.forEach((listener) => {
        listener();
    });
};


// System Preference Listener

const addSystemQueryListener = (query: MediaQueryList, listener: (event: MediaQueryListEvent) => void) => {
    if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
        return;
    }

    query.addListener?.(listener);
};

const removeSystemQueryListener = (query: MediaQueryList, listener: (event: MediaQueryListEvent) => void) => {
    if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", listener);
        return;
    }

    query.removeListener?.(listener);
};

const removeSystemListener = () => {
    if (!systemQuery || !systemQueryHandler) return;
    removeSystemQueryListener(systemQuery, systemQueryHandler);
    systemQuery = undefined;
    systemQueryHandler = undefined;
};

const handleSystemThemeChange = () => {
    if (preference !== "system") return;
    const nextResolvedTheme = resolveTheme(preference, environment);
    if (resolvedTheme === nextResolvedTheme) return;
    resolvedTheme = nextResolvedTheme;
    applyThemeToDocument(resolvedTheme, environment);
    notifyListeners();
};

const syncSystemListener = () => {
    removeSystemListener();
    if (preference !== "system" || !environment.matchMedia) return;

    // Only System mode should subscribe to OS changes. User overrides should
    // detach the listener so Light and Dark remain stable.
    systemQuery = environment.matchMedia(DARK_SCHEME_QUERY);
    systemQueryHandler = handleSystemThemeChange;
    addSystemQueryListener(systemQuery, systemQueryHandler);
};


// Preference Updates

const applyPreference = (nextPreference: ThemePreference, { persist }: ApplyPreferenceOptions) => {
    const previousPreference = preference;
    const previousResolvedTheme = resolvedTheme;

    preference = nextPreference;
    if (persist) writeStoredPreference(preference, environment);
    resolvedTheme = resolveTheme(preference, environment);
    applyThemeToDocument(resolvedTheme, environment);
    syncSystemListener();

    if (previousPreference !== preference || previousResolvedTheme !== resolvedTheme) {
        notifyListeners();
    }
};

export const initializeTheme = (nextEnvironment: ThemeEnvironment = defaultEnvironment()) => {
    // Re-initialization in tests or hot reload should detach the old environment.
    removeSystemListener();
    environment = nextEnvironment;
    applyPreference(readStoredPreference(environment), { persist: false });
};

export const setThemePreference = (nextPreference: ThemePreference) => {
    applyPreference(nextPreference, { persist: true });
};

export const getThemePreference = (): ThemePreference => preference;
export const getResolvedTheme = (): ResolvedTheme => resolvedTheme;

// Theme subscriptions should return an unsubscribe callback for component cleanup.
export const subscribeTheme = (listener: ThemeListener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
