export abstract class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 'VALIDATION_ERROR', 1);
  }
}

export class FileNotFoundError extends CLIError {
  constructor(public readonly path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND', 1);
  }
}

export class SchemaValidationError extends CLIError {
  constructor(message: string, public readonly errors: unknown[]) {
    super(message, 'SCHEMA_VALIDATION_ERROR', 1);
  }
}

export class GenerationError extends CLIError {
  constructor(message: string, public readonly cause?: Error) {
    super(message, 'GENERATION_ERROR', 1);
  }
}

export class InvalidInputError extends CLIError {
  constructor(message: string) {
    super(message, 'INVALID_INPUT', 1);
  }
}
