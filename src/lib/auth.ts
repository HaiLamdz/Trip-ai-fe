export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt_token');
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwt_token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwt_token');
  }
};

export const isAuthenticated = (): boolean => !!getToken();
