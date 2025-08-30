// Conditional logging utility for production-safe logging

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogMessage {
  level: LogLevel
  message: string
  data?: any
  component?: string
}

class Logger {
  private isDevelopment: boolean
  private enabledLevels: Set<LogLevel>

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = process.env.NODE_ENV === 'development' || 
                        process.env.NODE_ENV === 'dev' ||
                        !process.env.NODE_ENV

    // In production, only show warnings and errors
    this.enabledLevels = this.isDevelopment 
      ? new Set(['debug', 'info', 'warn', 'error'])
      : new Set(['warn', 'error'])
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabledLevels.has(level)
  }

  private formatMessage(component: string | undefined, message: string): string {
    const prefix = component ? `[${component}]` : '[Niftory]'
    return `${prefix} ${message}`
  }

  debug(message: string, data?: any, component?: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage(component, message), data || '')
    }
  }

  info(message: string, data?: any, component?: string): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(component, message), data || '')
    }
  }

  warn(message: string, data?: any, component?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(component, message), data || '')
    }
  }

  error(message: string, data?: any, component?: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(component, message), data || '')
    }
  }

  // Component-specific loggers for better organization
  createComponentLogger(componentName: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, componentName),
      info: (message: string, data?: any) => this.info(message, data, componentName),
      warn: (message: string, data?: any) => this.warn(message, data, componentName),
      error: (message: string, data?: any) => this.error(message, data, componentName),
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export component logger factory
export const createLogger = (componentName: string) => logger.createComponentLogger(componentName)