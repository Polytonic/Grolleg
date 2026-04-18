import { state, INITIAL_STATE, SHAPE_MODES } from "../source/views/shrinkage-calculator/state";

// Creates a minimal mock event with currentTarget.value for input handlers
export function mockInputEvent(value: string): Event {
    return { currentTarget: { value } } as unknown as Event;
}

// Creates a minimal mock event with currentTarget.checked for checkbox handlers
export function mockCheckboxEvent(checked: boolean): Event {
    return { currentTarget: { checked } } as unknown as Event;
}

// Creates a minimal mock event with currentTarget.value for select handlers
export function mockSelectEvent(value: string): Event {
    return { currentTarget: { value } } as unknown as Event;
}

// Creates a minimal mock keyboard event for key handler tests
export function mockKeyboardEvent(key: string): KeyboardEvent & { defaultPrevented: boolean } {
    let prevented = false;
    return {
        key,
        get defaultPrevented() { return prevented; },
        preventDefault() { prevented = true; },
        currentTarget: null,
    } as unknown as KeyboardEvent & { defaultPrevented: boolean };
}

// Resets calculator state to match production defaults.
// Uses INITIAL_STATE from state.ts so tests and production stay in sync.
export function resetState() {
    Object.assign(state, INITIAL_STATE);
    // dimensions is an array, so spread a fresh copy to avoid shared reference
    state.dimensions = SHAPE_MODES[state.shapeIndex].fields.map(() => "");
}
