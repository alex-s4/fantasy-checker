// ============================================================
//  GameTime — test harness
//  Loads the REAL index.html + app.js (+ shared.js, and whatever else
//  app.js imports) into a jsdom-backed environment, with external CDN
//  <script> tags stripped (FontAwesome/pdf.js/Bootstrap — none needed
//  for these smoke tests). Runs fully offline and deterministically.
//
//  IMPORTANT: app.js uses real ES module `import` syntax. jsdom's own
//  <script type="module"> execution is unreliable (confirmed empirically —
//  it silently fails to fetch/execute local or even http-served module
//  scripts in this jsdom version). So instead of letting jsdom load the
//  script, we bypass that entirely: inject jsdom's window/document/
//  navigator as Node globals, then use Node's own (reliable) dynamic
//  import() to load app.js directly. This is why app.js is imported here
//  rather than added as a <script> tag in the HTML.
// ============================================================
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { JSDOM } = require('jsdom');

function stripRemoteScripts(html) {
    return html.replace(/<script[^>]+src="https:\/\/[^"]+"[^>]*><\/script>\s*/g, '');
}

/** Loads index.html + app.js into a fresh jsdom-backed environment and
 *  resolves once app.js's `window.onload` handler has run.
 *  Returns { window, document }.
 *  Defaults assume this file lives in a `tests/` subfolder alongside the
 *  real index.html/app.js at the repo root — pass explicit paths if your
 *  layout differs. */
async function loadApp({ htmlPath = path.join(__dirname, '..', 'index.html'), appJsPath = path.join(__dirname, '..', 'app.js') } = {}) {
    const rawHtml = fs.readFileSync(htmlPath, 'utf8');
    const html = stripRemoteScripts(rawHtml);

    const dom = new JSDOM(html, {
        url: 'http://localhost/',
        runScripts: 'dangerously',
        resources: undefined, // we already stripped remote scripts; no network needed
        pretendToBeVisual: true,
    });
    const { window } = dom;

    // navigator.clipboard doesn't exist in jsdom by default — Copy/Save
    // handlers call it. Stub it so those code paths don't throw.
    Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: async () => {} },
        configurable: true,
    });

    // Bootstrap's JS bundle (Popover/Toast) is presentational only and not
    // needed for functional smoke tests — stub just enough of its API so
    // app.js's init code doesn't throw.
    window.bootstrap = {
        Popover: function () {},
        Toast: { getOrCreateInstance: () => ({ show: () => {} }) },
    };

    // Inject jsdom's window/document/navigator as real Node globals — this
    // is what lets app.js's `document.querySelector(...)` etc. (written
    // assuming a browser environment) work when loaded via Node's import().
    global.window = window;
    global.document = window.document;
    Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });
    global.localStorage = window.localStorage;
    global.bootstrap = window.bootstrap;

    // Cache-bust the import so each loadApp() call gets a FRESH module
    // execution rather than Node's cached one from a previous test's
    // loadApp() call — without this, only the FIRST test's window would
    // ever get `window.onload` assigned (ES module top-level code only
    // runs once per unique specifier).
    const cacheBustedUrl = `${pathToFileURL(path.resolve(appJsPath)).href}?t=${Date.now()}-${Math.random()}`;
    await import(cacheBustedUrl);

    if (typeof window.onload !== 'function') {
        throw new Error('app.js did not set window.onload — did the script throw? Check console output above.');
    }
    window.onload();

    return { window, document: window.document, dom };
}

module.exports = { loadApp };