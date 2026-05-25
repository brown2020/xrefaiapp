export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export function getSearchParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getSearchParamInt(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
): number | undefined {
  const value = getSearchParam(params, key);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
