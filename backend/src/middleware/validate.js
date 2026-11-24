class ValidationError extends Error {
  constructor(details) {
    super('Validation failed');
    this.status = 400;
    this.details = details;
  }
}

/**
 * Validates a todo payload. With `partial` (PATCH) every field is optional,
 * otherwise `title` is required. Returns only the known, validated fields.
 */
function parseTodo(body, { partial = false } = {}) {
  const errors = [];
  const out = {};
  body = body && typeof body === 'object' ? body : {};

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      errors.push('title is required and must be a non-empty string');
    } else if (body.title.trim().length > 255) {
      errors.push('title must be at most 255 characters');
    } else {
      out.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.push('description must be a string or null');
    } else {
      out.description = body.description;
    }
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') errors.push('completed must be a boolean');
    else out.completed = body.completed;
  }

  if (partial && !errors.length && Object.keys(out).length === 0) {
    errors.push('provide at least one of: title, description, completed');
  }

  if (errors.length) throw new ValidationError(errors);
  return out;
}

module.exports = { parseTodo, ValidationError };
