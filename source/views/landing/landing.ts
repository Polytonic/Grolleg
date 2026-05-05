import m from "mithril";


export const LandingView: m.Component = {
    view: () => m(".landing",
        m(".container",
            m("h1.title", "Grolleg"),
            m("p.subtitle", "Studio pottery tools."),
        ),
    ),
};
