declare module "mithril-query" {
    import { Component, ClosureComponent } from "mithril";

    interface MithrilQuery {
        rootEl: HTMLElement;
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
