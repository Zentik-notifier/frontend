import { ApiConfigService } from '@/services/api-config';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/services/auth-storage';

class AuthService {
  private static instance: AuthService;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  private constructor() { }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private decodeJWT(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string, bufferSeconds: number = 30): boolean {
    const decoded = this.decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= (decoded.exp - bufferSeconds);
  }

  public async ensureValidToken(): Promise<string | null> {
    try {
      const currentToken = await getAccessToken();
      if (!currentToken) return null;
      if (!this.isTokenExpired(currentToken)) return currentToken;
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        // await clearTokens();
        return null;
      }
      return refreshed;
    } catch (error) {
      // await clearTokens();
      return null;
    }
  }

  public async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) return this.refreshPromise;
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return null;
        const url = `${ApiConfigService.getApiUrlSync()}/api/v1/graphql`;
        const body = {
          query: 'mutation Refresh($refreshToken: String!) { refreshAccessToken(refreshToken: $refreshToken) { accessToken refreshToken } }',
          errorPolicy: "all",
          variables: { refreshToken },
        };
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await resp.json();
        const data = json?.data?.refreshAccessToken;
        if (!data?.accessToken || !data?.refreshToken) return null;
        await saveTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      } catch (e) {
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  public async clearTokens(): Promise<void> {
    await clearTokens();
  }

  public async getAccessToken(): Promise<string | null> {
    return getAccessToken();
  }

  public async getRefreshToken(): Promise<string | null> {
    return getRefreshToken();
  }

  public async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await saveTokens(accessToken, refreshToken);
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();


