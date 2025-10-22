/**
 * GraphQL Client with authentication
 * Replaces Apollo Client for GraphQL requests
 */

import { GraphQLClient } from 'graphql-request';
import { authService } from './auth-service';
import { settingsService } from './settings-service';

export class AuthenticatedGraphQLClient extends GraphQLClient {
  constructor() {
    super(`${settingsService.getApiUrl()}/api/v1/graphql`, {
      requestMiddleware: async (request) => {
        const validToken = await authService.ensureValidToken();
        const deviceToken = settingsService.getAuthData().deviceToken;

        return {
          ...request,
          headers: {
            ...request.headers,
            authorization: validToken ? `Bearer ${validToken}` : '',
            ...(deviceToken && { deviceToken }),
          },
        };
      },
      responseMiddleware: async (response) => {
        if ('status' in response && response.status === 401) {
          console.warn('GraphQL request returned 401 - attempting token refresh');
          
          // Try to refresh token
          const refreshToken = settingsService.getAuthData().refreshToken;
          if (refreshToken) {
            try {
              const newToken = await authService.refreshAccessTokenRest();
              if (newToken) {
                console.log('Token refreshed successfully');
                // Retry the request with new token
                return;
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              // Could implement logout logic here
            }
          }
        }
      },
    });
  }
}

export const graphqlClient = new AuthenticatedGraphQLClient();