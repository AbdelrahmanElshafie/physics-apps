/**
 * Applies the stored theme before first paint.
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
        var theme = JSON.parse(raw)?.state?.theme;
        if (theme === 'light' || theme === 'dark') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      } catch (e) {}
    })();
  `

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
