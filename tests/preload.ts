// Stub CSS imports for bun:test. Parcel's @css alias and .css imports
// are build-time features that don't exist in the test environment.
import { plugin } from "bun";

plugin({
    name: "css-stub",
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, () => ({
            contents: "",
            loader: "js",
        }));
    },
});
