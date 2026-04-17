export const handleFieldErrors = (err: any) => {
  if (err?.errors) {
    const map: Record<string, string> = {};

    err.errors.forEach((e: any) => {
      map[e.field] = e.error;
    });

    return map;
  }
};
