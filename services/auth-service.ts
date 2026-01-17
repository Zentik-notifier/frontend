import { settingsService } from '@/services/settings-service';

class AuthService {
  private static instance: AuthService;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private ensureValidTokenPromise: Promise<string | null> | null = null;

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

  public async ensureValidToken(rest?: boolean): Promise<string | null> {
    // Always read the latest token from BehaviorSubject
    // This ensures we get the most recent token even if saveTokens was just called
    const currentToken = settingsService.getAuthData().accessToken;
    if (!currentToken) return null;
    
    // If token is not expired, return it immediately (no need to refresh)
    if (!this.isTokenExpired(currentToken)) return currentToken;
    
    // If there's already a refresh in progress, return the existing promise
    if (this.ensureValidTokenPromise) {
      return this.ensureValidTokenPromise;
    }

    this.ensureValidTokenPromise = (async () => {
      try {
        // Re-read token in case it was updated while we were waiting
        const latestToken = settingsService.getAuthData().accessToken;
        if (!latestToken) return null;
        if (!this.isTokenExpired(latestToken)) return latestToken;
        if (rest) {
          const refreshed = await this.refreshAccessTokenRest();
          console.log('[authService] token expired and refreshed via REST');
          if (!refreshed) {
            return null;
          }
          return refreshed;
        } else {
          const refreshed = await this.refreshAccessToken();
          console.log('[authService] token expired and refreshed via GraphQL');
          if (!refreshed) {
            return null;
          }
          return refreshed;
        }
      } catch (error) {
        return null;
      } finally {
        this.ensureValidTokenPromise = null;
      }
    })();

    return this.ensureValidTokenPromise;
  }

  public async refreshAccessTokenRest(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) return this.refreshPromise;
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = settingsService.getAuthData().refreshToken;
        if (!refreshToken) return null;
        const url = `${settingsService.getApiUrl()}/api/v1/auth/refresh`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const accessToken = data?.accessToken;
        const newRefreshToken = data?.refreshToken;
        if (!accessToken || !newRefreshToken) return null;
        await settingsService.saveTokens(accessToken, newRefreshToken);
        return accessToken as string;
      } catch (e) {
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  public async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) return this.refreshPromise;
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = settingsService.getAuthData().refreshToken;
        if (!refreshToken) return null;
        const url = `${settingsService.getApiUrl()}/api/v1/graphql`;
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
        await settingsService.saveTokens(data.accessToken, data.refreshToken);
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
    await settingsService.clearTokens();
  }

  public async getAccessToken(): Promise<string | null> {
    return settingsService.getAuthData().accessToken;
  }

  public async getRefreshToken(): Promise<string | null> {
    return settingsService.getAuthData().refreshToken;
  }

  public async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await settingsService.saveTokens(accessToken, refreshToken);
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();


