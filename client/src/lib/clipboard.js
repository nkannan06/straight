// navigator.clipboard requires a secure context (HTTPS or localhost) — it's
// silently undefined when testing over a plain-HTTP LAN address (e.g. from a
// phone during dev) and can also throw inside some native WebViews. Falls
// back to the older execCommand copy, which works everywhere a text
// selection does. Returns true if the text ended up on the clipboard.
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}
