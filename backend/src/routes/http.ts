import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { badRequest } from '../errors';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function bodyOf(req: Request): Record<string, unknown> {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }
  return {};
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw badRequest('INVALID_INPUT', `"${field}" must be a string.`);
  }
  return value;
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, field);
}
