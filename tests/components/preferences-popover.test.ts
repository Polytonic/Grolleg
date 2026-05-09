import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import m from "mithril";
import mq from "mithril-query";
import { PreferencesPopover, closePreferencesPopovers } from "../../source/components/preferences-popover";
import { getThemePreference, initializeTheme, setThemePreference } from "../../source/theme";


// Test Document

const listeners = new Map<string, Set<EventListener>>();
const focusedIds: string[] = [];

const stubDocument = {
    addEventListener(type: string, handler: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: EventListener) {
        listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((handler) => handler(event));
    },
    getElementById(id: string) {
        return { focus: () => { focusedIds.push(id); } } as unknown as HTMLElement;
    },
} as unknown as Document;

const originalRedraw = m.redraw;

type PopoverOutput = ReturnType<typeof mq> & { onremove: () => void };

const mountedPopovers: PopoverOutput[] = [];

const renderPopover = (placement: "desktop" | "mobile" = "desktop") => {
    const output = mq(PreferencesPopover, { placement }) as PopoverOutput;
    mountedPopovers.push(output);
    return output;
};

const removePopover = (output: PopoverOutput) => {
    output.onremove();
    const outputIndex = mountedPopovers.indexOf(output);
    if (outputIndex >= 0) mountedPopovers.splice(outputIndex, 1);
};

const themeOptionByText = (output: PopoverOutput, text: string): HTMLElement => {
    const option = Array.from(output.rootEl.querySelectorAll<HTMLElement>(".preferences-popover__theme-option"))
        .find((button) => button.textContent === text);
    if (!option) throw new Error(`Missing theme option: ${text}`);
    return option;
};

const listenerCount = (type: string) => listeners.get(type)?.size ?? 0;

// focusLater schedules with setTimeout(0), so focus assertions wait one macrotask.
const flushFocus = () => new Promise((resolve) => setTimeout(resolve, 0));

const dispatchDocumentPointerDown = (target: Node) => {
    const event = new Event("pointerdown");
    Object.defineProperty(event, "target", { value: target });
    document.dispatchEvent(event);
};

const dispatchDocumentEscape = () => {
    let defaultPrevented = false;
    document.dispatchEvent({
        type: "keydown",
        key: "Escape",
        preventDefault() { defaultPrevented = true; },
    } as unknown as Event);
    return defaultPrevented;
};

const dispatchKeydown = (target: HTMLElement, key: string) => {
    const event = target.ownerDocument.createEvent("Event");
    event.initEvent("keydown", true, true);
    Object.defineProperty(event, "key", { value: key });
    target.dispatchEvent(event);
    return event.defaultPrevented;
};

beforeEach(() => {
    const redraw = (() => {}) as typeof m.redraw;
    redraw.sync = () => {};
    globalThis.document = stubDocument;
    m.redraw = redraw;
    initializeTheme({});
});

afterEach(() => {
    closePreferencesPopovers(false);
    mountedPopovers.splice(0).forEach((output) => output.onremove());
    initializeTheme({});
    listeners.clear();
    focusedIds.length = 0;
    m.redraw = originalRedraw;
    // @ts-expect-error -- remove the stub so it does not leak to other files
    delete globalThis.document;
});


// Render
describe("PreferencesPopover render", () => {
    it("renders an accessible trigger and hidden controlled panel", () => {
        const output = renderPopover();
        const trigger = output.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;
        const panelId = trigger.getAttribute("aria-controls")!;
        const panel = output.rootEl.querySelector(`#${panelId}`) as HTMLElement;

        expect(trigger.getAttribute("aria-label")).toBe("Preferences");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
        expect(panel.getAttribute("role")).toBe("dialog");
        expect(panel.getAttribute("aria-label")).toBe("Preferences");
        expect(panel.hasAttribute("hidden")).toBe(true);
    });

    it("renders a theme group with stacked radio rows", () => {
        const output = renderPopover();
        const groups = output.rootEl.querySelectorAll("[role='radiogroup']");
        const checkedOptions = output.rootEl.querySelectorAll("[role='radio'][aria-checked='true']");
        const options = output.rootEl.querySelectorAll("[role='radio']");
        const nativeInputs = output.rootEl.querySelectorAll("input[type='radio'], input[type='checkbox']");
        const optionMarks = output.rootEl.querySelectorAll(".preferences-popover__option-mark");
        const optionLabels = Array.from(options).map((option) => option.textContent);

        expect(groups.length).toBe(1);
        expect(groups[0]?.getAttribute("aria-label")).toBe("Theme");
        expect(output.rootEl.querySelector(".preferences-popover__theme-list")).not.toBeNull();
        expect(output.rootEl.querySelector(".preferences-popover__segments")).toBeUndefined();
        expect(output.rootEl.querySelector(".preferences-popover__segment")).toBeUndefined();
        expect(nativeInputs.length).toBe(0);
        expect(options.length).toBe(3);
        expect(optionLabels).toEqual(["System", "Light", "Dark"]);
        expect(optionMarks.length).toBe(0);
        expect(checkedOptions.length).toBe(1);
        expect(themeOptionByText(output, "System").getAttribute("aria-checked")).toBe("true");
    });
});


// Interaction
describe("PreferencesPopover interaction", () => {
    it("opens from the trigger, focuses the selected theme row, and updates shared theme state", async () => {
        setThemePreference("dark");
        const output = renderPopover();
        const trigger = output.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;

        trigger.click();
        output.redraw();
        await flushFocus();

        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(output.rootEl.querySelector(".preferences-popover__panel")?.hasAttribute("hidden")).toBe(false);
        expect(focusedIds).toContain(`${trigger.getAttribute("aria-controls")}-theme-dark`);

        themeOptionByText(output, "Light").click();
        output.redraw();

        expect(getThemePreference()).toBe("light");
        expect(themeOptionByText(output, "System").getAttribute("aria-checked")).toBe("false");
        expect(themeOptionByText(output, "Light").getAttribute("aria-checked")).toBe("true");
    });

    it("keeps desktop and mobile popovers on the same theme state", () => {
        const desktop = renderPopover();
        const mobile = renderPopover("mobile");

        themeOptionByText(desktop, "Light").click();
        desktop.redraw();
        mobile.redraw();

        expect(themeOptionByText(mobile, "Light").getAttribute("aria-checked")).toBe("true");
        expect(themeOptionByText(desktop, "Light").getAttribute("tabindex")).toBe("0");
        expect(themeOptionByText(mobile, "System").getAttribute("tabindex")).toBe("-1");
    });

    it("keeps only one popover instance open at a time", () => {
        const desktop = renderPopover();
        const mobile = renderPopover("mobile");
        const desktopTrigger = desktop.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;
        const mobileTrigger = mobile.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;

        desktopTrigger.click();
        desktop.redraw();
        mobile.redraw();
        expect(desktopTrigger.getAttribute("aria-expanded")).toBe("true");
        expect(mobileTrigger.getAttribute("aria-expanded")).toBe("false");
        expect(listenerCount("pointerdown")).toBe(1);
        expect(listenerCount("keydown")).toBe(1);

        mobileTrigger.click();
        desktop.redraw();
        mobile.redraw();

        expect(desktopTrigger.getAttribute("aria-expanded")).toBe("false");
        expect(mobileTrigger.getAttribute("aria-expanded")).toBe("true");
        expect(listenerCount("pointerdown")).toBe(1);
        expect(listenerCount("keydown")).toBe(1);
    });

    it("selects and focuses adjacent theme rows with arrow keys", async () => {
        const output = renderPopover();
        const system = themeOptionByText(output, "System");

        dispatchKeydown(system, "ArrowRight");
        output.redraw();
        await flushFocus();

        expect(getThemePreference()).toBe("light");
        expect(themeOptionByText(output, "Light").getAttribute("aria-checked")).toBe("true");
        expect(focusedIds.some((id) => id.endsWith("-theme-light"))).toBe(true);
    });

    it("selects edge theme rows with Home and End", () => {
        const output = renderPopover();
        const system = themeOptionByText(output, "System");

        dispatchKeydown(system, "End");
        output.redraw();
        expect(getThemePreference()).toBe("dark");

        dispatchKeydown(themeOptionByText(output, "Dark"), "Home");
        output.redraw();
        expect(getThemePreference()).toBe("system");
    });

    it("selects the focused theme row with Space or Enter", () => {
        const output = renderPopover();

        dispatchKeydown(themeOptionByText(output, "Dark"), " ");
        output.redraw();
        expect(getThemePreference()).toBe("dark");

        dispatchKeydown(themeOptionByText(output, "Light"), "Enter");
        output.redraw();
        expect(getThemePreference()).toBe("light");
    });

    it("closes on outside pointerdown without returning focus to the trigger", async () => {
        const output = renderPopover();
        const trigger = output.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;
        const outside = output.rootEl.ownerDocument.createElement("button");

        trigger.click();
        output.redraw();
        dispatchDocumentPointerDown(outside);
        output.redraw();
        await flushFocus();

        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(focusedIds).not.toContain(trigger.id);
    });

    it("closes on Escape and returns focus to the trigger", async () => {
        const output = renderPopover();
        const trigger = output.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;

        trigger.click();
        output.redraw();
        const defaultPrevented = dispatchDocumentEscape();
        output.redraw();
        await flushFocus();

        expect(defaultPrevented).toBe(true);
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(focusedIds).toContain(trigger.id);
    });

    it("closes on Escape from a focused theme row and returns focus to the trigger", async () => {
        const output = renderPopover();
        const trigger = output.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;

        trigger.click();
        output.redraw();
        await flushFocus();
        focusedIds.length = 0;

        const defaultPrevented = dispatchKeydown(themeOptionByText(output, "System"), "Escape");
        output.redraw();
        await flushFocus();

        expect(defaultPrevented).toBe(true);
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(focusedIds).toContain(trigger.id);
        expect(listenerCount("pointerdown")).toBe(0);
        expect(listenerCount("keydown")).toBe(0);
    });

    it("removes document listeners and global closers on remove", async () => {
        const output = renderPopover();
        const trigger = output.rootEl.querySelector(".preferences-popover__trigger") as HTMLElement;

        trigger.click();
        output.redraw();
        expect(listenerCount("pointerdown")).toBe(1);
        expect(listenerCount("keydown")).toBe(1);

        removePopover(output);
        expect(listenerCount("pointerdown")).toBe(0);
        expect(listenerCount("keydown")).toBe(0);

        focusedIds.length = 0;
        closePreferencesPopovers(true);
        await flushFocus();

        expect(focusedIds).not.toContain(trigger.id);
    });
});
