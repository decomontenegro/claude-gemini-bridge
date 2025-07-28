export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  // Basic logging methods
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  trace(message: string, context?: LogContext): void;
  
  // Structured logging
  log(level: LogLevel, message: string, context?: LogContext): void;
  
  // Child logger with additional context
  child(context: LogContext): Logger;
  
  // Performance logging
  time(label: string): void;
  timeEnd(label: string): void;
  
  // Configuration
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}