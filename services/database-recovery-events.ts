/**
 * Simple EventEmitter implementation for React Native
 * Since Node.js 'events' module is not available in React Native
 */
class SimpleEventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[SimpleEventEmitter] Error in listener for event "${event}":`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Global event emitter for database recovery events
 * This allows services (like db-setup.ts) to notify React components
 * about database corruption without direct dependencies
 */
class DatabaseRecoveryEventEmitter extends SimpleEventEmitter {
  private static instance: DatabaseRecoveryEventEmitter;

  static getInstance(): DatabaseRecoveryEventEmitter {
    if (!DatabaseRecoveryEventEmitter.instance) {
      DatabaseRecoveryEventEmitter.instance = new DatabaseRecoveryEventEmitter();
    }
    return DatabaseRecoveryEventEmitter.instance;
  }
}

export const databaseRecoveryEvents = DatabaseRecoveryEventEmitter.getInstance();

// Event names
export const DATABASE_CORRUPTION_DETECTED = 'database-corruption-detected';
