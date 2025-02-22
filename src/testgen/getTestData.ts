import { createRouter } from '../server/index';

export async function getTestData<T>(path: string, router = createRouter()): Promise<T> {
  const url = new URL(path, 'https://demo.api/');
  const request = new Request(url.toString());

  if (path.includes('/portal')) {
    const token = `0-${Date.now() + Math.pow(10, 10)}`;
    request.headers.set('Authorization', `Bearer ${token}`);
  }

  return router.handleRequest(request)!.handlerPromise.then(r => r.json());
}
