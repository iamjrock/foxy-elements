import { endpoint } from '..';
import halson from 'halson';

export function composeCountries(values: Record<string, any>): any {
  const result = halson(values)
    .addLink('self', `${endpoint}/property_helpers/countries`)
    .addLink('fx:property_helpers', `${endpoint}/property_helpers`);
  return result;
}
