// Global debug flag - can be set via browser console or environment
declare global {
  interface Window {
    IsDebug?: boolean;
  }
}

class DebugLogger {
  private isEnabled(): boolean {
    // Check global window variable first
    if (typeof window !== 'undefined' && window.IsDebug !== undefined) {
      return window.IsDebug;
    }
    
    // Fallback to environment variable
    return process.env.NODE_ENV === 'development';
  }

  log(message: string, ...args: any[]): void {
    if (this.isEnabled()) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.isEnabled()) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.isEnabled()) {
      console.warn(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.isEnabled()) {
      console.info(`[DEBUG] ${message}`, ...args);
    }
  }

  // Method to enable/disable debug from browser console
  setDebug(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      window.IsDebug = enabled;
      console.log(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Method to check current debug status
  getDebugStatus(): boolean {
    return this.isEnabled();
  }
}

// Export singleton instance
export const debug = new DebugLogger();

// Make debug available globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).debug = debug;
  (window as any).setDebug = (enabled: boolean) => debug.setDebug(enabled);
}
