/**
 * Typed application error. Routes translate this into a JSON error body with a
 * stable machine-readable `code` so the UI can react without string matching.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: unknown): AppError =>
  new AppError(400, code, message, details);

export const forbidden = (code: string, message: string): AppError =>
  new AppError(403, code, message);

export const notFound = (code: string, message: string): AppError =>
  new AppError(404, code, message);

export const conflict = (code: string, message: string): AppError =>
  new AppError(409, code, message);

export const tooLarge = (code: string, message: string): AppError =>
  new AppError(413, code, message);

/** Convert unexpected Node filesystem errors into actionable API errors. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const err = error as NodeJS.ErrnoException;
  switch (err.code) {
    case 'ENOENT':
      return notFound('NOT_FOUND', 'The requested file or folder does not exist.');
    case 'EACCES':
    case 'EPERM':
      return forbidden(
        'PERMISSION_DENIED',
        'Permission denied. Check the filesystem permissions for this vault.',
      );
    case 'EEXIST':
      return conflict('ALREADY_EXISTS', 'An item with that name already exists.');
    case 'ENOTDIR':
      return badRequest('NOT_A_DIRECTORY', 'That path is not a folder.');
    case 'EISDIR':
      return badRequest('IS_A_DIRECTORY', 'That path is a folder, not a note.');
    case 'ENOSPC':
      return new AppError(507, 'DISK_FULL', 'The disk is full; the note could not be saved.');
    case 'EROFS':
      return forbidden('READ_ONLY', 'The vault is on a read-only filesystem.');
    case 'ENAMETOOLONG':
      return badRequest('NAME_TOO_LONG', 'The file or folder name is too long.');
    default:
      return new AppError(500, 'INTERNAL_ERROR', 'An unexpected filesystem error occurred.');
  }
}
