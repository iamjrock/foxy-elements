import { HandleResult, HandlerContext, Router } from 'service-worker-router';

import { Dataset } from './types';

export function createCollectionGetHandler(router: Router, dataset: Dataset) {
  return async ({ params, url }: HandlerContext): Promise<Response> => {
    const limit = parseInt(url.searchParams.get('limit') ?? '20');
    const offset = parseInt(url.searchParams.get('offset') ?? '0');
    const filters = new URLSearchParams(url.searchParams);

    filters.delete('zoom');
    filters.delete('limit');
    filters.delete('offset');

    const filtersAsArray = Array.from(filters.entries());
    const allDocuments = dataset[params.collection] ?? [];
    const matchingDocuments = allDocuments.filter(document => {
      return filtersAsArray.every(([field, value]) => document[field] == value);
    });

    const itemsToReturn = await Promise.all(
      matchingDocuments.slice(offset, limit + offset).map(async doc => {
        const selfLink = `${url.origin}${url.pathname}/${doc.id}${url.search}${url.hash}`;
        const result = router.handleRequest(new Request(selfLink)) as HandleResult;
        const json = await (await result.handlerPromise).json();

        return json;
      })
    );

    const first = new URL('', url);
    first.searchParams.set('offset', '0');

    const prev = new URL('', url);
    prev.searchParams.set('offset', Math.max(offset - limit, 0).toString());

    const next = new URL('', url);
    next.searchParams.set('offset', Math.min(matchingDocuments.length, offset + limit).toString());

    const last = new URL('', url);
    last.searchParams.set('offset', Math.max(matchingDocuments.length - limit, 0).toString());

    const responseBody = {
      _embedded: { [`fx:${params.collection}`]: itemsToReturn },
      _links: {
        first: { href: first.toString() },
        self: { href: url.toString() },
        prev: { href: prev.toString() },
        next: { href: next.toString() },
        last: { href: last.toString() },
      },
      total_items: matchingDocuments.length,
      returned_items: itemsToReturn.length,
      offset,
      limit,
    };

    return new Response(JSON.stringify(responseBody));
  };
}
