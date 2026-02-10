/**
 * Lightweight Handlebars-compatible template engine.
 * Supports only simple {{key}} and {{nested.key}} interpolation.
 * Replaces the full handlebars library (~3.7 MB) for basic template preview.
 */

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current == null) return "";
    current = current[key];
  }
  return current != null ? String(current) : "";
}

/**
 * Compiles a template string with {{placeholder}} syntax.
 * Returns a function that accepts data and returns the interpolated string.
 *
 * @example
 * const render = compileTemplate("Hello {{user}}!");
 * render({ user: "John" }); // "Hello John!"
 */
export function compileTemplate(
  template: string
): (data: Record<string, any>) => string {
  return (data: Record<string, any>) =>
    template.replace(/\{\{([^{}]+)\}\}/g, (_, key: string) =>
      getNestedValue(data, key.trim())
    );
}
