import m from "mithril";
import "@css/components/preferences-popover.css";
import { slidersIcon } from "./icons";
import { focusLater } from "./interaction";
import {
    type ThemePreference,
    THEME_PREFERENCES,
    getThemePreference,
    setThemePreference,
    subscribeTheme,
} from "../theme";


// Theme Options

const THEME_LABELS: Record<ThemePreference, string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
};

interface PreferencesPopoverAttrs {
    placement: "desktop" | "mobile";
    onBeforeOpen?: () => void;
}

let popoverCounter = 0;

type PopoverCloser = (returnFocus: boolean) => void;
const popoverClosers = new Set<PopoverCloser>();

// The nav shell should close every preferences instance before opening another overlay.
export const closePreferencesPopovers = (returnFocus = false) => {
    popoverClosers.forEach((closePopover) => {
        closePopover(returnFocus);
    });
};


// Event Helpers

const stopPopoverEvent = (event: Event) => {
    event.stopPropagation();
};

const themeId = (popoverId: string, option: ThemePreference) =>
    `${popoverId}-theme-${option}`;

const themeAtOffset = (option: ThemePreference, offset: number): ThemePreference => {
    const currentIndex = THEME_PREFERENCES.indexOf(option);
    const nextIndex = (currentIndex + offset + THEME_PREFERENCES.length) % THEME_PREFERENCES.length;
    return THEME_PREFERENCES[nextIndex];
};

const themeForKey = (key: string, option: ThemePreference): ThemePreference | undefined => {
    switch (key) {
        case "ArrowLeft":
        case "ArrowUp":
            return themeAtOffset(option, -1);
        case "ArrowRight":
        case "ArrowDown":
            return themeAtOffset(option, 1);
        case "Home":
            return THEME_PREFERENCES[0];
        case "End":
            return THEME_PREFERENCES[THEME_PREFERENCES.length - 1];
        default:
            return undefined;
    }
};

const selectTheme = (option: ThemePreference, popoverId?: string) => {
    setThemePreference(option);
    if (popoverId) focusLater(themeId(popoverId, option));
};

const handleThemeKeydown = (
    event: KeyboardEvent,
    option: ThemePreference,
    popoverId: string,
    closeFromRow: () => void,
) => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeFromRow();
        return;
    }

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTheme(option, popoverId);
        return;
    }

    const nextTheme = themeForKey(event.key, option);
    if (!nextTheme) {
        return;
    }

    event.preventDefault();
    selectTheme(nextTheme, popoverId);
};


// Theme Rows

const themeRow = (
    popoverId: string,
    option: ThemePreference,
    selectedTheme: ThemePreference,
    closeFromRow: () => void,
) => {
    const isSelected = selectedTheme === option;
    const optionId = themeId(popoverId, option);

    return m(`button.preferences-popover__theme-option${isSelected ? ".active" : ""}`, {
        id: optionId,
        key: option,
        type: "button",
        role: "radio",
        "aria-checked": isSelected ? "true" : "false",
        tabindex: isSelected ? 0 : -1,
        onclick: (event: Event) => {
            event.stopPropagation();
            selectTheme(option);
        },
        onkeydown: (event: KeyboardEvent) => {
            event.stopPropagation();
            handleThemeKeydown(event, option, popoverId, closeFromRow);
        },
    }, THEME_LABELS[option]);
};

const themeGroup = (popoverId: string, closeFromRow: () => void) => {
    const selectedTheme = getThemePreference();

    return m(".preferences-popover__group", { role: "radiogroup", "aria-label": "Theme" },
        m(".preferences-popover__label", "Theme"),
        m(".preferences-popover__theme-list",
            THEME_PREFERENCES.map((option) => themeRow(popoverId, option, selectedTheme, closeFromRow)),
        ),
    );
};


// Preferences Popover

export const PreferencesPopover: m.ClosureComponent<PreferencesPopoverAttrs> = () => {
    const instanceId = ++popoverCounter;
    const popoverId = `preferences-popover-${instanceId}`;
    const triggerId = `preferences-popover-trigger-${instanceId}`;

    let rootElement: HTMLElement | null = null;
    let documentListening = false;
    let open = false;
    let shouldFocusSelectedTheme = false;
    let unsubscribeTheme: (() => void) | undefined;

    // The popover should own document listeners only while open. Escape returns
    // focus to the trigger, but pointer dismissal should leave focus where the
    // user clicked.
    const removeDocumentListeners = () => {
        if (!documentListening || typeof document === "undefined") return;
        document.removeEventListener("pointerdown", handleDocumentPointerDown);
        document.removeEventListener("keydown", handleDocumentKeydown);
        documentListening = false;
    };

    const close = (returnFocus: boolean) => {
        if (!open) return;
        open = false;
        shouldFocusSelectedTheme = false;
        removeDocumentListeners();
        if (returnFocus) focusLater(triggerId);
    };

    const focusSelectedTheme = () => {
        globalThis.document?.getElementById(themeId(popoverId, getThemePreference()))?.focus();
    };

    const syncOpenFocus = () => {
        if (!open || !shouldFocusSelectedTheme) return;
        shouldFocusSelectedTheme = false;
        focusSelectedTheme();
    };

    function handleDocumentPointerDown(event: Event) {
        const target = event.target as Node | null;
        if (target && rootElement?.contains(target)) return;
        close(false);
        m.redraw();
    }

    function handleDocumentKeydown(event: KeyboardEvent) {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        close(true);
        m.redraw();
    }

    const addDocumentListeners = () => {
        if (documentListening || typeof document === "undefined") return;
        document.addEventListener("pointerdown", handleDocumentPointerDown);
        document.addEventListener("keydown", handleDocumentKeydown);
        documentListening = true;
    };

    const toggle = (attrs: PreferencesPopoverAttrs) => {
        if (open) {
            close(false);
            return;
        }

        // Mobile navigation should close its drawer before this overlay opens.
        attrs.onBeforeOpen?.();
        closePreferencesPopovers(false);
        open = true;
        shouldFocusSelectedTheme = true;
        addDocumentListeners();
    };

    const closeFromThemeRow = () => {
        close(true);
        m.redraw();
    };

    const trigger = (attrs: PreferencesPopoverAttrs) =>
        m("button.preferences-popover__trigger", {
            id: triggerId,
            type: "button",
            "aria-label": "Preferences",
            "aria-expanded": open ? "true" : "false",
            "aria-controls": popoverId,
            "aria-haspopup": "dialog",
            onclick: (event: Event) => {
                event.stopPropagation();
                toggle(attrs);
            },
        }, slidersIcon(20));

    const panel = () =>
        m(".preferences-popover__panel", {
            id: popoverId,
            role: "dialog",
            "aria-label": "Preferences",
            hidden: open ? undefined : true,
            // Panel events should not bubble into the mobile nav card shell.
            onclick: stopPopoverEvent,
            onpointerdown: stopPopoverEvent,
        },
            themeGroup(popoverId, closeFromThemeRow),
        );

    return {
        oninit() {
            popoverClosers.add(close);
            unsubscribeTheme = subscribeTheme(() => {
                if (rootElement?.isConnected) m.redraw();
            });
        },
        onremove() {
            popoverClosers.delete(close);
            unsubscribeTheme?.();
            removeDocumentListeners();
            rootElement = null;
        },
        view: ({ attrs }) =>
            m(`.preferences-popover.preferences-popover--${attrs.placement}${open ? ".open" : ""}`, {
                oncreate: (vnode: m.VnodeDOM) => {
                    rootElement = vnode.dom as HTMLElement;
                    syncOpenFocus();
                },
                onupdate: syncOpenFocus,
                onclick: stopPopoverEvent,
                onpointerdown: stopPopoverEvent,
            },
                trigger(attrs),
                panel(),
            ),
    };
};
