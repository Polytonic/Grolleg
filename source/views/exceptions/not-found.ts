import m from "mithril";
import "@css/views/exceptions/not-found.css";

export const NotFoundView: m.Component = {
    view: () => m(".not-found-view",
        m(".container",
            m("h1.title", "Page Not Found"),
            m("p.subtitle", "The address you opened isn't a tool in this suite."),
            m(m.route.Link, {
                class: "not-found-view__link",
                href: "/",
            }, "Go to the home page"),
        ),
    ),
};
