export function describeBootError(error, { stage, url = '' } = {}) {
  const message = error instanceof Error ? error.message : String(error || '未知错误');
  return { stage, message, url };
}

export function retryUrl(url, locationHref = globalThis.location?.href || '') {
  const target = new URL(url || locationHref, locationHref || 'http://localhost/');
  target.searchParams.set('reload', Date.now().toString(36));
  return target.href;
}
