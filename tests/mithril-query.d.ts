declare module "mithril-query" {
    import { Component, ClosureComponent } from "mithril";

    interface MithrilQuery {
        rootEl: HTMLElement;
        redraw: () => void;
        first: (selector: string) => any;
        find: (selector: string) => any[];
        has: (selector: string) => boolean;
        click: (selector: string, event?: Partial<MouseEvent>, silent?: boolean) => void;
        trigger: (selector: string, eventName: string, event?: Partial<Event>, silent?: boolean) => void;
        should: {
            contain(text: string): void;
            have(selector: string): void;
            not: {
                contain(text: string): void;
                have(selector: string): void;
            };
        };
    }

    function mq(component: Component<any> | ClosureComponent<any>, attrs?: Record<string, any>): MithrilQuery;
    export default mq;
}
