/**
 * `authAxios` (lib/axios.js) already returns `response.data` — the HTTP body.
 * Django's `ApiResponse` wraps that body as `{ message, data, status }`, while
 * the analytics report views return the payload bare. This resolves both.
 *
 * Every service in this folder used to read `response.data?.data`, i.e. it
 * unwrapped twice: for a bare payload that is `payload.data?.data`, which is
 * undefined, so the B2C analytics page received `null` and rendered nothing.
 */
export function unwrapData(body) {
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) {
    return body.data;
  }
  return body;
}
