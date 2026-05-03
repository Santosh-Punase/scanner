const KEY_TOKEN = 'scanner.token';
const KEY_NAME = 'scanner.name';
const KEY_ADMIN = 'scanner.isAdmin';

export function getToken() {
  return localStorage.getItem(KEY_TOKEN);
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  return {
    name: localStorage.getItem(KEY_NAME) || 'guest',
    isAdmin: localStorage.getItem(KEY_ADMIN) === '1',
  };
}

export function setSession({ token, name, isAdmin }) {
  localStorage.setItem(KEY_TOKEN, token);
  localStorage.setItem(KEY_NAME, name || 'guest');
  localStorage.setItem(KEY_ADMIN, isAdmin ? '1' : '0');
}

export function clearSession() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_NAME);
  localStorage.removeItem(KEY_ADMIN);
}
