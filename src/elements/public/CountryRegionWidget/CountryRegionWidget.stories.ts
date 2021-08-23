import './index';

import { Summary } from '../../../storygen/Summary';
import { getMeta } from '../../../storygen/getMeta';
import { getStory } from '../../../storygen/getStory';

const summary: Summary = {
  href: 'https://demo.foxycart.com/property_helpers/countries?include_regions',
  nucleon: true,
  localName: 'foxy-country-widget',
  translatable: true,
};

export default getMeta(summary);

export const Playground = getStory({ ...summary, code: true });
export const NoRegions = getStory(summary);
export const Empty = getStory(summary);
export const Error = getStory(summary);
export const Busy = getStory(summary);

NoRegions.args.href = NoRegions.args.href!.replace('?include_regions', '');
Empty.args.href = '';
Error.args.href = 'https://demo.foxycart.com/s/admin/not-found';
Busy.args.href = 'https://demo.foxycart.com/s/admin/sleep';
