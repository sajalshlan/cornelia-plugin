import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = 'cornelia_tokens';

export const getTokens = () => {
  try {
    const tokens = localStorage.getItem(TOKEN_KEY);
    return tokens ? JSON.parse(tokens) : null;
  } catch (error) {
    return null;
  }
};

export const storeTokens = (tokens) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
}; 