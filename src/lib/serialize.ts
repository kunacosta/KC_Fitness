export function serializeDecimal<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "object" &&
      item !== null &&
      "toNumber" in item &&
      typeof item.toNumber === "function"
        ? item.toNumber()
        : item,
    ),
  ) as T;
}
