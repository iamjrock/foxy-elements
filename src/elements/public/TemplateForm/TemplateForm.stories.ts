import './index';

import { Summary } from '../../../storygen/Summary';
import { getMeta } from '../../../storygen/getMeta';
import { getStory } from '../../../storygen/getStory';

/**
 * @param templateType
 */
function createConfig(templateType: string) {
  const summary: Summary = {
    configurable: {},
    href: 'https://demo.foxycart.com/s/admin/cart_templates/0',
    localName: 'foxy-template-form',
    nucleon: true,
    parent: 'https://demo.foxycart.com/s/admin/stores/0/cart_templates',
    translatable: true,
  };
  const newHref = summary.href!.replace('cart_templates', templateType);
  const newParent = summary.parent!.replace('cart_templates', templateType);
  return { ...summary, href: newHref, parent: newParent };
}

export default getMeta(createConfig('cart_templates'));

export const Playground = getStory({ ...createConfig('cart_templates'), code: true });
export const CheckoutTemplate = getStory(createConfig('checkout_templates'));
export const EmailTemplate = getStory(createConfig('email_templates'));
export const Empty = getStory(createConfig('cart_templates'));
export const Error = getStory(createConfig('cart_templates'));
export const Busy = getStory(createConfig('cart_templates'));

Empty.args.href = '';
Error.args.href = 'https://demo.foxycart.com/s/admin/not-found';
Busy.args.href = 'https://demo.foxycart.com/s/admin/sleep';
