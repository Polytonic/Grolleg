import { state, cloneInitialState } from "../source/views/shrinkage-calculator/state";

export function mockInputEvent(value: string): Event {
    return { currentTarget: { value } } as unknown as Event;
}

export function mockCheckboxEvent(checked: boolean): Event {
    return { currentTarget: { checked } } as unknown as Event;
}

export function mockSelectEvent(value: string): Event {
    return { currentTarget: { value } } as unknown as Event;
}

export function mockKeyboardEvent(key: string): KeyboardEvent & { defaultPrevented: boolean } {
    let prevented = false;
    return {
        key,
        get defaultPrevented() { return prevented; },
        preventDefault() { prevented = true; },
        currentTarget: null,
    } as unknown as KeyboardEvent & { defaultPrevented: boolean };
}

export function resetShrinkageState() {
    Object.assign(state, cloneInitialState());
}
