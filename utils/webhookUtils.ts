import { HttpMethod } from "@/generated/gql-operations-generated";

/**
 * Get the color for a specific HTTP method
 * @param method - The HTTP method
 * @returns The color string for the method
 */
export function getHttpMethodColor(method: HttpMethod | string): string {
  switch (method) {
    case HttpMethod.Get:
    case 'GET':
      return '#4CAF50'; // Green
    case HttpMethod.Post:
    case 'POST':
      return '#2196F3'; // Blue
    case HttpMethod.Put:
    case 'PUT':
      return '#FF9800'; // Orange
    case HttpMethod.Patch:
    case 'PATCH':
      return '#9C27B0'; // Purple
    case HttpMethod.Delete:
    case 'DELETE':
      return '#F44336'; // Red
    default:
      return '#666'; // Gray
  }
}
