import HttpError from "./httpError";

export function objectBody(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) 
        throw new HttpError(400, "Invalid request body");
    return value as Record<string, unknown>;
}

export function textField(
    value: unknown,
    field: string,
    required = false,
    max = 2000,
): string {
    if (value === undefined || value === null) {
        if (required) throw new HttpError(400, `'${field}' is required`);
        return "";
    }
    if (
        typeof value !== "string" ||
        value.trim().length > max ||
        (required && !value.trim())
    ) {
        throw new HttpError(400, `The value for '${field}' is invalid.`);
    }
    return value.trim();
}

