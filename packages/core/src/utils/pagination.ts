/**
 * RajutechieStreamKit Pagination Utilities
 *
 * Provides interfaces for cursor-based and offset-based pagination
 * used throughout the SDK.
 */

/**
 * Options for requesting a page of results.
 * Supports both cursor-based and offset-based pagination.
 */
export interface PaginationOptions {
  /** Maximum number of items to return per page. */
  limit?: number;

  /** Cursor pointing to the item after which results should start (cursor-based). */
  after?: string;

  /** Cursor pointing to the item before which results should start (cursor-based). */
  before?: string;

  /** Zero-based offset for offset-based pagination. */
  offset?: number;
}

/**
 * A page of results including metadata for navigating between pages.
 */
export interface PaginatedResult<T> {
  /** The items in this page. */
  data: T[];

  /** Total number of items matching the query (may be approximate). */
  total: number;

  /** Whether there is a next page available. */
  hasNext: boolean;

  /** Whether there is a previous page available. */
  hasPrevious: boolean;

  /** Cursor info for cursor-based pagination. */
  cursors: CursorPagination;
}

/**
 * Cursor metadata embedded inside a PaginatedResult.
 */
export interface CursorPagination {
  /** Cursor for fetching the next page (pass as `after`). Null when on the last page. */
  next: string | null;

  /** Cursor for fetching the previous page (pass as `before`). Null when on the first page. */
  previous: string | null;
}

/**
 * Build PaginationOptions into URL search params.
 */
export function paginationToParams(
  options: PaginationOptions = {},
): Record<string, string> {
  const params: Record<string, string> = {};

  if (options.limit !== undefined) {
    params['limit'] = String(options.limit);
  }
  if (options.after !== undefined) {
    params['after'] = options.after;
  }
  if (options.before !== undefined) {
    params['before'] = options.before;
  }
  if (options.offset !== undefined) {
    params['offset'] = String(options.offset);
  }

  return params;
}

/**
 * Default page size used when the caller does not specify a limit.
 */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Maximum allowed page size.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Clamp a requested limit to valid bounds.
 */
export function clampPageSize(limit?: number): number {
  if (limit === undefined || limit <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(limit, MAX_PAGE_SIZE);
}

/**
 * Construct an empty PaginatedResult for convenience.
 */
export function emptyPage<T>(): PaginatedResult<T> {
  return {
    data: [],
    total: 0,
    hasNext: false,
    hasPrevious: false,
    cursors: {
      next: null,
      previous: null,
    },
  };
}
