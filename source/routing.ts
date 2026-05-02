// Routing Helpers
// Pure helpers live outside index.ts so tests can import them without booting
// the browser app.

// HTML5 history mode (no hash). For GitHub Pages project pages the URL
// includes the repo name as a base path (e.g. polytonic.github.io/Grolleg/);
// detecting it at runtime keeps Mithril's routes (/t/shrinkage, /t/firing)
// matching against pathname slices that come after the base. Local dev runs
// at the host root, so the prefix is empty.
export const detectBase = (hostname: string, pathname: string): string => {
    if (hostname.endsWith(".github.io")) {
        const firstSegment = pathname.split("/")[1] ?? "";
        if (firstSegment) return "/" + firstSegment;
    }
    return "";
};
