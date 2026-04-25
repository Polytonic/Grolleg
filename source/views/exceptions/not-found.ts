import m from "mithril";
import "@css/views/exceptions/not-found.css";

// 404 view, rendered when the URL doesn't match any registered route. The
// visual stays minimal so the user's attention goes to the recovery action
// (a link back to the default tool) rather than the explanation. Sets
// document.title in parallel with the calculator views so the browser tab
// and screen readers reflect the state.
export const NotFoundView: m.Component = {
    oncreate: () => {
        if (typeof document !== "undefined") {
            document.title = "Grolleg • Page Not Found";
        }
    },
    view: () => m(".not-found-view",
        m(".container",
            m("h1.title", "Page Not Found"),
            m("p.subtitle", "The address you opened isn't a tool in this suite."),
            m(m.route.Link, {
                class: "not-found-view__link",
                href: "/shrinkage",
            }, "Go to the Shrinkage Calculator"),
        ),
    ),
};
