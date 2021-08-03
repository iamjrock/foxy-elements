import { Checkbox, Group } from '../../private/index';
import { css, html, CSSResultArray, PropertyDeclarations, TemplateResult } from 'lit-element';
import { ConfigurableMixin } from '../../../mixins/configurable';
import { Item } from './types';
import { NucleonElement } from '../NucleonElement';
import { NucleonV8N } from '../NucleonElement/types';
import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { ThemeableMixin } from '../../../mixins/themeable';
import { TranslatableMixin } from '../../../mixins/translatable';
import { ifDefined } from 'lit-html/directives/if-defined';
import memoize from 'lodash-es/memoize';
import { InternalConfirmDialog } from '../../internal/InternalConfirmDialog';

const NS = 'email-template-form';

const Base = ScopedElementsMixin(
  ThemeableMixin(ConfigurableMixin(TranslatableMixin(NucleonElement, NS)))
);

export class EmailTemplateForm extends Base<Item> {
  static get styles(): CSSResultArray {
    return [
      ...super.styles,
      css`
        .cached-content::part(input-field) {
          max-height: 15em;
        }
      `,
    ];
  }

  static get properties(): PropertyDeclarations {
    return {
      ...super.properties,
      __cacheSuccess: { type: Boolean, attribute: false },
      __customizeTextState: { type: Boolean, attribute: false },
      __customizeHtmlState: { type: Boolean, attribute: false },
    };
  }

  static get scopedElements(): ScopedElementsMap {
    return {
      'foxy-i18n': customElements.get('foxy-i18n'),
      'foxy-internal-confirm-dialog': customElements.get('foxy-internal-confirm-dialog'),
      'foxy-internal-sandbox': customElements.get('foxy-internal-sandbox'),
      'foxy-spinner': customElements.get('foxy-spinner'),
      'vaadin-button': customElements.get('vaadin-button'),
      'vaadin-radio-button': customElements.get('vaadin-radio-button'),
      'vaadin-radio-group': customElements.get('vaadin-radio-group'),
      'vaadin-text-area': customElements.get('vaadin-text-area'),
      'vaadin-text-field': customElements.get('vaadin-text-field'),
      'x-checkbox': Checkbox,
      'x-group': Group,
    };
  }

  static get v8n(): NucleonV8N<Item> {
    return [
      ({ description: v }) => !v || v.length <= 100 || 'first_name_too_long',
      ({ content_html: v }) => !v || v.length <= 50 || 'content_html_invalid',
      ({ content_html_url: v }) => !v || (v && v.length <= 300) || 'content_html_url_invalid',
      ({ content_html_url: v }) =>
        !v || EmailTemplateForm.__isValidUrl(v) || 'content_html_url_invalid',
      ({ content_text: v }) => !v || v.length <= 50 || 'content_text_invalid',
      ({ content_text_url: v }) => !v || (v && v.length <= 300) || 'content_text_url_invalid',
      ({ content_text_url: v }) =>
        !v || EmailTemplateForm.__isValidUrl(v) || 'content_text_url_invalid',
    ];
  }

  private __cacheErrors = [];

  private __cacheSuccess = false;

  private __customizeTextState = false;

  private __customizeHtmlState = false;

  private __getValidator = memoize((prefix: string) => () => {
    return !this.errors.some(err => err.startsWith(prefix));
  });

  private __bindField = memoize((key: keyof Item) => {
    return (evt: CustomEvent) => {
      const target = evt.target as HTMLInputElement;
      this.edit({ [key]: target.value });
    };
  });

  render(): TemplateResult {
    return html`
      <foxy-internal-confirm-dialog
        data-testid="confirm-cache"
        message="cache_prompt"
        confirm="cache"
        cancel="cancel"
        header="cache"
        theme="primary error"
        lang=${this.lang}
        ns=${this.ns}
        id="confirm-cache"
        @hide=${this.__handleConfirmCache}
      >
      </foxy-internal-confirm-dialog>
      <vaadin-text-field
        class="w-full"
        label=${this.t('description').toString()}
        value=${ifDefined(this.form?.description)}
        data-testid="description"
        @input=${this.__bindField('description')}
        error-message=${this.__getErrorMessage('description')}
      >
      </vaadin-text-field>
      <vaadin-text-field
        class="w-full"
        label=${this.t('subject').toString()}
        value=${ifDefined(this.form['subject' as keyof Item])}
        data-testid="subject"
        @input=${this.__bindField('subject' as keyof Item)}
        error-message=${this.__getErrorMessage('subject')}
      >
      </vaadin-text-field>
      <x-checkbox
        class="w-full py-m"
        ?readonly=${this.readonly}
        @change=${(ev: CustomEvent) => (this.__customizeTextState = ev.detail)}
      >
        <foxy-i18n key="customize-text-template" lang=${this.lang} ns=${this.ns}> </foxy-i18n>
      </x-checkbox>
      ${this.__customizeTextState ? this.__renderContentCache('text') : ''}
      <x-checkbox
        class="w-full py-m"
        ?readonly=${this.readonly}
        @change=${(ev: CustomEvent) => (this.__customizeHtmlState = ev.detail)}
      >
        <foxy-i18n key="customize-html-template" lang=${this.lang} ns=${this.ns}> </foxy-i18n>
      </x-checkbox>
      ${this.__customizeHtmlState ? this.__renderContentCache('html') : ''}
      <vaadin-button
        data-testid="action"
        theme=${this.in('idle') ? `primary ${this.href ? 'error' : 'success'}` : ''}
        class="w-full mt-m"
        ?disabled=${!this.errors.length}
        @click=${this.__handleActionSubmit}
      >
        <foxy-i18n lang=${this.lang} key="update" ns=${this.ns}> </foxy-i18n>
      </vaadin-button>
    `;
  }

  private __getErrorMessage(prefix: string) {
    const error = this.errors.find(err => err.startsWith(prefix));
    return error ? this.t(error.replace(prefix, 'v8n')) : '';
  }

  private static __isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  private static _all_images_over_https(text: string) {
    return !!text.match(/src="http:\/\//);
  }

  private __handleActionCache(ev: CustomEvent) {
    const confirm = this.renderRoot.querySelector('#confirm-cache');
    if (confirm) {
      (confirm as InternalConfirmDialog).show(ev.currentTarget as HTMLElement);
    }
  }

  private __handleActionSubmit() {
    this.submit();
  }

  private __handleConfirmCache(evt: CustomEvent) {
    if (!evt.detail.cancelled) this.__handleCache();
  }

  private async __handleCache() {
    if (!(this.data && this.data._links && this.data._links['fx:cache'])) {
      return;
    }
    console.log(this.data._links['fx:cache'].href);
    const result = await this._fetch(this.data._links['fx:cache'].href, {
      body: '',
      method: 'POST',
    });
    if (result) {
      const errorResult = result as any;
      if (errorResult['_embedded'] && errorResult['embedded']['fx:errors']) {
        this.__cacheErrors = errorResult['fx:errors'].map((i: { message: string }) => i.message);
      } else {
        this.__cacheSuccess = true;
        this.__cacheErrors = [];
        setTimeout(() => (this.__cacheSuccess = false), 3000);
      }
    }
  }

  private __renderContentCache(contentType: 'text' | 'html') {
    const urlField = `content_${contentType}_url` as keyof Item;
    const contentField = `content_${contentType}` as keyof Item;
    return html`
      <x-group frame>
        <foxy-i18n slot="header" key="field-${contentType}"></foxy-i18n>
        <div class="p-m">
          <vaadin-text-field
            class="w-full"
            label=${this.t(urlField).toString()}
            value=${ifDefined(this.form[urlField])}
            data-testid=${urlField}
            @input=${this.__bindField(urlField)}
            error-message=${this.__getErrorMessage(urlField)}
            >
          </vaadin-text-field>
          <vaadin-button
            @click=${this.__handleActionCache}
            ?disabled=${!(
              this.form &&
              this.form[urlField] &&
              (this.form[urlField] as string)?.length > 0 &&
              this.__getErrorMessage(urlField).length == 0
            )}
            class="mt-s">
            <foxy-i18n
              lang=${this.lang}
              key="cache"
              ns=${this.ns}>
          </vaadin-button>
          ${
            this.__cacheSuccess
              ? html`<foxy-i18n key="cache-success" lang=${this.lang} ns=${this.ns}></foxy-i18n>`
              : ''
          }
          ${
            this.__cacheErrors.length
              ? html`<foxy-i18n
                  class="color-error"
                  key="cache-error"
                  lang=${this.lang}
                  ns=${this.ns}
                ></foxy-i18n>`
              : ''
          }
        </div>
        <div class="p-m">
          <vaadin-text-area
            id="${contentField}"
            data-testid="${contentField}"
            class="w-full cached-content"
            label="${contentField}"
            value=${ifDefined(this.form[contentField])}
            >
          </vaadin-text-area>
        </div>
      </x-group>
    `;
  }
}
