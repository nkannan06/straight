// iOS WKWebView repeatedly failed to repaint a CSS `transform` change on the
// knob when only its class/style flipped (the track color updated but the
// knob stayed put or overshot). Positioning the knob with flexbox instead —
// `justify-start` vs `justify-end` — moves it via a real layout pass, which
// WebKit always repaints reliably. The knob itself carries no transform.
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors duration-200 ${
        checked ? 'justify-end bg-accent-olive' : 'justify-start bg-white/15'
      }`}
    >
      <span className="h-6 w-6 rounded-full bg-ivory shadow-sm" />
    </button>
  );
}
