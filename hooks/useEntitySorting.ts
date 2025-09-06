import { useMemo } from 'react';

export interface SortableEntity {
  id: string;
  createdAt: string;
  [key: string]: any;
}

export type SortOrder = 'asc' | 'desc';

export function useEntitySorting<T extends SortableEntity>(
  entities: T[],
  sortOrder: SortOrder = 'desc'
) {
  return useMemo(() => {
    if (!entities || entities.length === 0) {
      return [];
    }

    return [...entities].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      if (sortOrder === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [entities, sortOrder]);
}

export function useEntitySortingWithFallback<T extends SortableEntity>(
  entities: T[],
  sortOrder: SortOrder = 'desc',
  fallbackField?: keyof T
) {
  return useMemo(() => {
    if (!entities || entities.length === 0) {
      return [];
    }

    return [...entities].sort((a, b) => {
      // Try createdAt first
      if (a.createdAt && b.createdAt) {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        
        if (sortOrder === 'asc') {
          return dateA.getTime() - dateB.getTime();
        } else {
          return dateB.getTime() - dateA.getTime();
        }
      }
      
      // Fallback to updatedAt if createdAt is not available
      if (a.updatedAt && b.updatedAt) {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        
        if (sortOrder === 'asc') {
          return dateA.getTime() - dateB.getTime();
        } else {
          return dateB.getTime() - dateA.getTime();
        }
      }
      
      // Fallback to custom field if specified
      if (fallbackField && a[fallbackField] && b[fallbackField]) {
        const valueA = a[fallbackField];
        const valueB = b[fallbackField];
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          if (sortOrder === 'asc') {
            return valueA.localeCompare(valueB);
          } else {
            return valueB.localeCompare(valueA);
          }
        }
      }
      
      // Default: no change in order
      return 0;
    });
  }, [entities, sortOrder, fallbackField]);
}