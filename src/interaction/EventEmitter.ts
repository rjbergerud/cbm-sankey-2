import { SankeyEventType, SankeyEventCallback } from '../core/types';

type EventMap = {
  [K in SankeyEventType]: SankeyEventCallback<unknown>[];
};

/**
 * Simple event emitter for Sankey events
 */
export class EventEmitter {
  private listeners: Partial<EventMap> = {};

  /**
   * Subscribe to an event
   */
  on<T>(event: SankeyEventType, callback: SankeyEventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback as SankeyEventCallback<unknown>);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off<T>(event: SankeyEventType, callback: SankeyEventCallback<T>): void {
    const callbacks = this.listeners[event];
    if (!callbacks) return;

    const index = callbacks.indexOf(callback as SankeyEventCallback<unknown>);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: SankeyEventType, data: T): void {
    const callbacks = this.listeners[event];
    if (!callbacks) return;

    for (const callback of callbacks) {
      callback(data);
    }
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners = {};
  }
}
