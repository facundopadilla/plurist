let csrfToken = "";

export function getCsrfToken(): string {
  return csrfToken;
}

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export function clearCsrfToken() {
  csrfToken = "";
}
