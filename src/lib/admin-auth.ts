const ADMIN_KEY = 'photo_admin_token';

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!sessionStorage.getItem(ADMIN_KEY);
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_KEY);
}
