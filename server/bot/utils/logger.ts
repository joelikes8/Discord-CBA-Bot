// A simple logger utility

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;
  
  constructor() {
    // Set log level based on environment (defaulting to INFO in production)
    this.level = process.env.NODE_ENV === 'production' 
      ? (process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO)
      : LogLevel.DEBUG;
  }
  
  // Format the log message with timestamp and level
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  // Debug level logging
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message);
      console.debug(formattedMessage, ...args);
    }
  }
  
  // Info level logging
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message);
      console.info(formattedMessage, ...args);
    }
  }
  
  // Warning level logging
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message);
      console.warn(formattedMessage, ...args);
    }
  }
  
  // Error level logging
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message);
      console.error(formattedMessage, ...args);
    }
  }
  
  // Set the log level
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    switch (level) {
      case 'debug':
        this.level = LogLevel.DEBUG;
        break;
      case 'info':
        this.level = LogLevel.INFO;
        break;
      case 'warn':
        this.level = LogLevel.WARN;
        break;
      case 'error':
        this.level = LogLevel.ERROR;
        break;
      default:
        this.level = LogLevel.INFO;
    }
  }
}

// Create and export a singleton instance
export const logger = new Logger();
