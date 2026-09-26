/**
 * Applies the stored theme, language and text direction before first paint.
 *
 * Without this the page renders in the default dark theme and then snaps to light for anyone who
 * chose it — a visible flash on every navigation. The script is tiny and deliberately defensive:
 * blocked or corrupted storage must fall through to the default rather than throw before the app
 * has rendered anything at all.
 */
export function ThemeScript() {
  const script = `
    (function () {
      try {
        var raw = localStorage.getItem('physics-workspace');
        if (!raw) return;
        var state = JSON.parse(raw)?.state;
        if (state?.theme === 'light' || state?.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
        // Direction especially must be right on the first frame: a page that renders
        // left-to-right and then flips is far more jarring than a colour change.
        if (state?.locale === 'ar' || state?.locale === 'en') {
          document.documentElement.setAttribute('lang', state.locale);
          document.documentElement.setAttribute('dir', state.locale === 'ar' ? 'rtl' : 'ltr');
        }
      } catch (e) {}
    })();
  `

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
