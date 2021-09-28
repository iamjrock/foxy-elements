import { endpoint } from '..';
import halson from 'halson';

export function composeTemplateConfig(doc: any) {
  const { id, store, ...publicData } = doc;
  const result = halson({ ...publicData, id })
    .addLink('self', `${endpoint}/template_configs/${id}`)
    .addLink('fx:store', `${endpoint}/stores/${store}`)
    .addLink('fx:template_sets', `${endpoint}/stores/template_configs/${id}`)
    .addLink('fx:cache', `${endpoint}/template_configs/${id}/template_sets`)
    .addLink('fx:encode', `${endpoint}/stores/${store}/encode`);
  return result;
}
