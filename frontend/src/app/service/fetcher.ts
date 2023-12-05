// TODO: add lti token/session
export async function fetcher<T>(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<T> {
  const res = await fetch(input, {
    headers: {
      Accept: 'application/json',
    },
    ...init,
  });
  if (!res.ok) {
    console.error(`Server error ${res.status} - ${res.statusText}`);
    throw new Error(res.statusText);
  }
  return res.json() as T;
}
