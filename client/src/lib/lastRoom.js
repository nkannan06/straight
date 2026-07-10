const KEY = 'straight.lastRoom';

export function getLastRoom() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function setLastRoom(code, name) {
  localStorage.setItem(KEY, JSON.stringify({ code, name }));
}

export function clearLastRoom() {
  localStorage.removeItem(KEY);
}
