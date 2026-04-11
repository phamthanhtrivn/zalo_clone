export function flattenObject(obj: any, parentKey = '', result = {}) {
  for (const key in obj) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;

    if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      flattenObject(obj[key], newKey, result);
    } else if (obj[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result[newKey] = obj[key];
    }
  }
  return result;
}
