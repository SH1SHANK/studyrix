export const OFFLINE_CACHE_NAME = "studyrix.study-materials.v1";

async function getCache() {
  return caches.open(OFFLINE_CACHE_NAME);
}

export async function isFileCached(cacheKey: string) {
  const cache = await getCache();
  const match = await cache.match(cacheKey);
  return Boolean(match);
}

export async function readCachedFile(cacheKey: string) {
  const cache = await getCache();
  return cache.match(cacheKey);
}

export async function cacheFile(cacheKey: string, response: Response) {
  const cache = await getCache();
  await cache.put(cacheKey, response);
}

export async function removeCachedFile(cacheKey: string) {
  const cache = await getCache();
  await cache.delete(cacheKey);
}
