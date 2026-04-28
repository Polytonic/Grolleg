import m from "mithril";
import "@css/views/exceptions/not-found.css";

// 404 view, rendered when the URL doesn't match any registered route. The
// visual stays minimal so the user's attention goes to the recovery action
// (a link back to the default tool) rather than the explanation. The route
// resolver in index.ts handles document.title via the titled() wrapper.
export const NotFoundView: m.Component = {
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
