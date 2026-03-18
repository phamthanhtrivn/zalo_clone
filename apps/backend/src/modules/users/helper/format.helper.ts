export function format(users: any) {
  const mapValue = new Map<string, any[]>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  users?.forEach((user) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const firstChar = user.name?.[0]?.toUpperCase() || '#';
    if (!mapValue.has(firstChar)) {
      mapValue.set(firstChar, []);
    }
    mapValue.get(firstChar)?.push(user);
  });
  return Array.from(mapValue, ([key, friends]) => ({
    key,
    friends,
  })).sort((a, b) => a.key.localeCompare(b.key));
}
