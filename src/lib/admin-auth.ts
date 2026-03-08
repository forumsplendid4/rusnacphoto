const ADMIN_KEY = 'photo_admin_authenticated';

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(ADMIN_KEY) === 'true';
}

export function setAdminAuthenticated(value: boolean): void {
  if (value) {
    sessionStorage.setItem(ADMIN_KEY, 'true');
  } else {
    sessionStorage.removeItem(ADMIN_KEY);
  }
}
