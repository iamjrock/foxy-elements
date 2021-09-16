import './index';
import { elementUpdated, expect, fixture, html, waitUntil } from '@open-wc/testing';
import { FetchEvent } from '../NucleonElement/FetchEvent';
import { TemplateForm } from './TemplateForm';
import { router } from '../../../server';

const emailTemplateUrl = 'https://demo.foxycart.com/s/admin/email_templates/0';
const cartTemplateUrl = 'https://demo.foxycart.com/s/admin/template/cart_templates/0';

describe('Input Validation', function () {
  interface inputChanges {
    changes: any;
    field: string;
    href: string;
    message: string;
    rule: string;
  }

  /**
   * Creates an object to edit the elements form, triggering field to enter
   * invalid state due to its length.
   *
   * @param field to create the params for.
   * @param url the href url to use, this allows testing for components using
   * email templates
   * @returns inputChanges
   */
  function longURL(field: string, url: string): inputChanges {
    const params = {
      changes: {},
      field,
      href: url,
      message: 'v8n_too_long',
      output: `${field}_too_long`,
      rule: 'must have fewer than 300 characters',
    };
    (params.changes as any)[field] = `http://demo.${Array(300).join('a')}.com/my_template`;
    return params;
  }

  /**
   * Creates an object to edit the elements form, triggering field to enter
   * invalid state due to URL invalid format.
   *
   * @param field to create the params for.
   * @param url the href url to use, this allows testing for components using
   * email templates
   * @returns inputChanges
   */
  function invalidURL(field: string, url: string): inputChanges {
    const params = {
      changes: {},
      field,
      href: url,
      message: 'v8n_invalid',
      output: `${field}_invalid`,
      rule: 'must be a URL',
    };
    (params.changes as any)[field] = `http/not a URL!!`;
    return params;
  }

  const cases = [
    longURL('content_url', cartTemplateUrl),
    longURL('content_text_url', emailTemplateUrl),
    longURL('content_html_url', emailTemplateUrl),
    invalidURL('content_url', cartTemplateUrl),
    invalidURL('content_text_url', emailTemplateUrl),
    invalidURL('content_html_url', emailTemplateUrl),
  ];
  for (const c of cases) {
    let contentType = '';
    switch (c.field) {
      case 'content_url':
        contentType = '';
        break;
      default:
        contentType = c.field.replace(/[^_]*_([^_]*)_.*/, '-$1');
    }
    it(`Validates ${contentType ? '' : 'non-'}emailTemplate ${c.field} to ${
      c.rule
    }`, async function () {
      const el: TemplateForm = await fixture(html`
        <foxy-template-form @fetch=${(evt: FetchEvent) => router.handleEvent(evt)} href="${c.href}">
        </foxy-template-form>
      `);
      await waitUntil(() => el.in('idle'), 'Element should become idle');
      el.edit(c.changes);
      await elementUpdated(el);
      const choice = el.shadowRoot?.querySelector(`[data-testid="template-type${contentType}"]`);
      expect(choice, `testid template-type${contentType} does not exist. ${c.href}`).to.exist;
      const error = choice?.getAttribute('error-message');
      expect(error).to.equal(c.message);
    });
  }
});

describe('Usability', function () {
  it('Should hide unused elements');
  it('Should should display overview of the possible configurations');
  it('Should should display overview of the possible configurations');
  it('Should detect it is an email template based on the href attribute');
});

describe('Email template', function () {
  it('Should provide options for HTML and pure text emails.');
  it('HTML email should be the default.');
});

describe('Cache', function () {
  it('Should provide a feature for caching the contents from provided URL');
});
