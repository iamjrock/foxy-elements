import { Checkbox, Group } from '../../private/index';
import { css, html, CSSResultArray, PropertyDeclarations, TemplateResult } from 'lit-element';
import { ConfigurableMixin } from '../../../mixins/configurable';
import { Item, TemplateConfigJson } from './types';
import { NucleonElement } from '../NucleonElement';
import { NucleonV8N } from '../NucleonElement/types';
import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { Tabs } from '../../private/Tabs/Tabs';
import { ThemeableMixin } from '../../../mixins/themeable';
import { TranslatableMixin } from '../../../mixins/translatable';
import { DetailsElement } from '@vaadin/vaadin-details';
import memoize from 'lodash-es/memoize';
import { InternalConfirmDialog } from '../../internal/InternalConfirmDialog';

type Tab = { title: string; content: TemplateResult };

const NS = 'template-config-form';

const Base = ScopedElementsMixin(
  ThemeableMixin(ConfigurableMixin(TranslatableMixin(NucleonElement, NS)))
);

export class TemplateConfigForm extends Base<Item> {
  static get styles(): CSSResultArray {
    return [
      ...super.styles,
      css`
        #cached-content::part(input-field) {
          max-height: 15em;
        }
      `,
    ];
  }

  static get properties(): PropertyDeclarations {
    return {
      ...super.properties,
      __cacheSuccess: { type: Boolean, attribute: false },
      __customizeTemplate: { type: Boolean, attribute: false },
      __hiddenProductOptions: { type: Array, attribute: false },
      __enabledAnalytics: { type: Boolean, attribute: false },
      __includeViaLoader: { type: Boolean, attribute: false },
    };
  }

  static get scopedElements(): ScopedElementsMap {
    return {
      'foxy-i18n': customElements.get('foxy-i18n'),
      'foxy-internal-confirm-dialog': customElements.get('foxy-internal-confirm-dialog'),
      'foxy-internal-sandbox': customElements.get('foxy-internal-sandbox'),
      'foxy-spinner': customElements.get('foxy-spinner'),
      'iron-icon': customElements.get('iron-icon'),
      'vaadin-button': customElements.get('vaadin-button'),
      'vaadin-radio-button': customElements.get('vaadin-radio-button'),
      'vaadin-radio-group': customElements.get('vaadin-radio-group'),
      'vaadin-text-area': customElements.get('vaadin-text-area'),
      'vaadin-text-field': customElements.get('vaadin-text-field'),
      'vaadin-combo-box': customElements.get('vaadin-combo-box'),
      'vaadin-details': DetailsElement,
      'x-checkbox': Checkbox,
      'x-group': Group,
      'x-tabs': Tabs,
    };
  }

  static get v8n(): NucleonV8N<Item> {
    return [
      ({ description: v }) => !v || v.length <= 100 || 'first_name_too_long',
      ({ json: v }) => !v || v.length <= 50 || 'content_invalid',
    ];
  }

  private __json: TemplateConfigJson | undefined;

  private __cacheErrors = [];

  private __cacheSuccess = false;

  private __getValidator = memoize((prefix: string) => () => {
    return !this.errors.some(err => err.startsWith(prefix));
  });

  private __bindField = memoize((key: keyof Item) => {
    return (evt: CustomEvent) => {
      const target = evt.target as HTMLInputElement;
      this.edit({ [key]: target.value });
    };
  });

  private __customizeTemplate = false;

  private __enabledAnalytics = false;

  private __includeViaLoader = false;

  private __hiddenProductOptions: string[] = [];

  private __renderTabs = (tabs: Tab[]) => {
    return html`
      <div class="pt-m">
        <x-tabs size=${tabs.length} ?disabled=${!this.in({ idle: 'snapshot' })}>
          ${tabs.map(
            (tab, index) => html`
              <foxy-i18n
                data-testclass="i18n"
                slot="tab-${index}"
                lang=${this.lang}
                key=${tab.title}
                ns=${this.ns}
              >
              </foxy-i18n>
              <div slot="panel-${index}">${tab.content}</div>
            `
          )}
        </x-tabs>
      </div>
    `;
  };

  private __customConfig: any = {};

  constructor() {
    super();
    this.addEventListener('fetch', (ev: Event) => {
      if (this.form && this.form.json) {
        this.__json = JSON.parse(this.form.json);
      }
    });
  }

  render(): TemplateResult {
    const tabs: Tab[] = [];
    tabs.push({ title: 'your-website', content: this.__renderYourWebsite() });
    tabs.push({ title: 'cart', content: this.__renderCart() });
    tabs.push({ title: 'checkout', content: this.__renderCheckout() });
    return html` ${tabs.length === 0 ? '' : this.__renderTabs(tabs)} `;
  }

  private __renderYourWebsite() {
    return html`
      ${this.__renderAnalytics()}
      <div class="p-m">
        <x-checkbox ?checked=${this.__getJsonAttribute('debug-usage') == 'required'}>
          <foxy-i18n key="debug-usage" lang=${this.lang} ns=${this.ns}></foxy-i18n>
        </x-checkbox>
      </div>
      <vaadin-text-area class="w-full" label=${this.t('custom_config')}> </vaadin-text-area>
    `;
  }

  private __renderCart() {
    return html`
      <x-group>
        <foxy-i18n slot="header" key="cart-display" ns=${this.ns}></foxy-i18n>
        ${this.__renderCartConfig()}
      </x-group>
    `;
  }

  private __renderCartConfig() {
    return html`<x-group>
        ${this.__renderCombo('cart_type', ['default', 'fullpage', 'custom'])}
        <vaadin-details>
          <foxy-i18n slot="summary" key="cart-display" ns=${this.ns}></foxy-i18n>
          <div class="p-m">
            ${this.__renderCombo(['cart_display_config', 'usage'], ['none', 'required'])}
            <div class="grid grid-cols-2 gap-m">
              ${[
                '--product--',
                'product_weight',
                'product_category',
                'product_code',
                'product_options',
                '--subscription--',
                'sub_frequency',
                'sub_startdate',
                'sub_nextdate',
                'enddate',
              ].map(i =>
                i.startsWith('--')
                  ? html` <foxy-i18n
                      class="col-span-2"
                      key=${i.replace(/-/g, '')}
                      ns=${this.ns}
                    ></foxy-i18n>`
                  : this.__renderCheckbox(['cart_display_config', `show_${i}`])
              )}
            </div>
            <vaadin-details>
              <foxy-i18n
                slot="summary"
                key="cart_display_config.hidden_product_options"
                ns=${this.ns}
              ></foxy-i18n>
              <vaadin-button @click=${this.__addHiddenProductOption}>
                <iron-icon icon="icons:add" slot="prefix"></iron-icon>
                <foxy-i18n key="add-hidden-product" ns=${this.ns}></foxy-i18n>
              </vaadin-button>
              ${this.__hiddenProductOptions.map(
                (e, i) => html` <vaadin-text-field class="w-full pt-s"> </vaadin-text-field> `
              )}
            </vaadin-details>
          </div>
        </vaadin-details>
      </x-group>
      ${['header', 'footer', 'checkout_fields', 'multiship_checkout_fields'].map(e =>
        this.__renderTextAreaField(['custom_script_values', e])
      )}
      <div class="p-m">
        <vaadin-combo-box
          label=${this.t('foxycomplete.usage')}
          value=${this.__getJsonAttribute('foxycomplete-usage') ?? ''}
          .items=${['none', 'required']}
        ></vaadin-combo-box>
        <div class="grid grid-cols-2 gap-m">
          <x-checkbox>
            <foxy-i18n ns=${this.ns} key="foxycomplete.show_combobox"></foxy-i18n>
          </x-checkbox>
          <x-checkbox>
            <foxy-i18n ns=${this.ns} key="foxycomplete.show_flags"></foxy-i18n>
          </x-checkbox>
          ${this.__renderTextField(['foxycomplete', 'combobox_open'])}
          ${this.__renderTextField(['foxycomplete', 'combobox_close'])}
        </div>
      </div>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="debug-usage"
            .items=${['none', 'shipping', 'billing', 'both', 'independent']}
          ></vaadin-combo-box>
          ${['shipping', 'billing'].map(
            e => html`
              <vaadin-combo-box
                label="${e}_filter_type"
                .items=${['blacklist', 'whitelist']}
              ></vaadin-combo-box>
              <vaadin-text-field label="${e}_filter_values"> </vaadin-text-field>
            `
          )}
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="postalcode_lookup"
            .items=${['none', 'required']}
          ></vaadin-combo-box>
        </div>
      </x-group> `;
  }

  private __renderCheckout() {
    return html`
      <x-group>
        <div class="p-m">
          ${['header', 'footer', 'checkout_fields', 'multiship_checkout_fields'].map(
            e => html` <vaadin-text-area label="custom_script_values-${e}"> </vaadin-text-area> `
          )}
        </div>
      </x-group>
      ${this.__renderCombo('checkout_type', [
        'default_account',
        'default_guest',
        'guest_only',
        'account_only',
      ])}
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="tos_checkbox_settings-usage"
            value=${this.__getJsonAttribute('tos_checkbox_settings-usage') ?? ''}
            .items=${['none', 'required', 'optional']}
          ></vaadin-combo-box>
          <vaadin-radio-group label="tos_checkbox_settings-initial_state" theme="horizontal">
            <vaadin-radio-button value="checked">
              <foxy-i18n key="checked"></foxy-i18n>
            </vaadin-radio-button>
            <vaadin-radio-button value="unchecked">
              <foxy-i18n key="unchecked"></foxy-i18n>
            </vaadin-radio-button>
          </vaadin-radio-group>
          <x-checkbox>
            <foxy-i18n
              key="tos_checkbox_settings-is_hidden"
              lang=${this.lang}
              ns=${this.ns}
            ></foxy-i18n>
          </x-checkbox>
          <vaadin-text-field label="tos_checkbox_settings-url"> </vaadin-text-field>
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="eu_secure_data_transfer_consent-usage"
            value=${this.__getJsonAttribute('eu_secure_data_transfer_consent-usage') ?? ''}
            .items=${['none', 'required']}
          ></vaadin-combo-box>
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="newsletter_subscribe-usage"
            value=${this.__getJsonAttribute('newsletter_subscribe-usage') ?? ''}
            .items=${['none', 'required']}
          ></vaadin-combo-box>
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="support_payment_cards-usage"
            value=${this.__getJsonAttribute('use_checkout_confirmation_window-usage') ?? ''}
            .items=${['visa', 'mastercard', 'discover', 'amex', 'dinersclub', 'maestro', 'laser']}
          ></vaadin-combo-box>
        </div>
      </x-group>
      ${this.__renderCombo('csc_requirements', ['all_cards', 'sso_only', 'new_cards_only'])}
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="colors-usage"
            value=${this.__getJsonAttribute('newsletter_subscribe-usage') ?? ''}
            .items=${['none', 'required']}
          ></vaadin-combo-box>
          <vaadin-text-field label="colors-primary"> </vaadin-text-field>
          <vaadin-text-field label="colors-secondary"> </vaadin-text-field>
          <vaadin-text-field label="colors-tertiary"> </vaadin-text-field>
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="use_checkout_confirmation_window-usage"
            value=${this.__getJsonAttribute('use_checkout_confirmation_window-usage') ?? ''}
            .items=${['none', 'required']}
          ></vaadin-combo-box>
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="custom_checkout_field_requirements-cart_controls"
            value=${this.__getJsonAttribute('custom_checkout_field_requirements-cart_controls') ??
            ''}
            .items=${['enabled', 'disabled']}
          ></vaadin-combo-box>
          <vaadin-combo-box
            label="custom_checkout_field_requirements-coupon_entry"
            value=${this.__getJsonAttribute('custom_checkout_field_requirements-coupon_entry') ??
            ''}
            .items=${['enabled', 'disabled']}
          ></vaadin-combo-box>
        </div>
        ${[
          'first_name',
          'last_name',
          'company',
          'tax_id',
          'phone',
          'address1',
          'address2',
          'city',
          'region',
          'postal_code',
          'country',
        ].map(i => this.__renderBillingField(`custom_checkout_field_requirements-billing_${i}`))}
      </x-group>
    `;
  }

  private __getJsonAttribute(attribute: string | Array<string>): any {
    if (this.form && this.form.json) {
      const o = JSON.parse(this.form.json);
      if (typeof attribute === 'string') {
        return o[attribute];
      } else {
        return attribute.reduce((acc, cur) => acc[cur], o);
      }
    }
  }

  private __setJsonAttribute(attribute: string | Array<string>, value: any): void {
    if (this.form && this.form.json) {
      const o = { ...JSON.parse(this.form.json), attribute: value };
      if (typeof attribute === 'string') {
        o[attribute] = value;
      } else {
        this.__deepSet(o, attribute, value);
      }
      this.form.json = JSON.stringify(o);
    }
  }

  private __deepSet(obj: Record<string, any>, keyList: string[], value: any) {
    let cursor = obj;
    for (let k = 0; k < keyList.length - 1; k++) {
      cursor = cursor[keyList[k]];
    }
    cursor[keyList[keyList.length - 1]] = value;
  }

  __renderAnalytics(): TemplateResult {
    return html`
      <x-group frame>
        <div class="p-m">
          <x-checkbox ?checked=${this.__enabledAnalytics} @change=${this.__usageAnalytics}>
            <foxy-i18n
              class="mx-s"
              key="analytics_config.label-enable"
              lang=${this.lang}
              ns=${this.ns}
            >
            </foxy-i18n>
          </x-checkbox>
          <vaadin-text-field
            class="w-full mt-s "
            label=${this.t('analytics_config.google_analytics.account_id')}
            value=${this.__getJsonAttribute([
              'analytics_config',
              'google_analytics',
              'account_id',
            ]) ?? ''}
            ?disabled=${!this.__enabledAnalytics}
          ></vaadin-text-field>
          <x-checkbox
            class="mt-s "
            ?disabled=${!this.__enabledAnalytics}
            ?checked=${this.__includeViaLoader}
            @change=${(ev: CustomEvent) => this.__setIncludeViaLoader(ev.detail)}
          >
            <foxy-i18n
              class="${!this.__enabledAnalytics ? 'text-disabled' : ''}"
              key=${'analytics_config.google_analytics.include_on_site'}
              lang=${this.lang}
              ns=${this.ns}
            >
            </foxy-i18n>
          </x-checkbox>
        </div>
      </x-group>
    `;
  }

  private __translatedItems(items: string[]): { label: string; value: string }[] {
    return items.map((i: string) => ({ label: this.t(i), value: i }));
  }

  private __renderCheckbox(attribute: string | string[]) {
    const label = typeof attribute == 'string' ? attribute : attribute.join('.');
    return html`
      <x-checkbox class="mt-s" ?checked=${this.__getJsonAttribute(attribute)}>
        <foxy-i18n key=${label} lang=${this.lang} ns=${this.ns}> </foxy-i18n>
      </x-checkbox>
    `;
  }

  private __renderCombo(attribute: string | Array<string>, items: string[]): TemplateResult {
    const label = typeof attribute == 'string' ? attribute : attribute.join('.');
    return html`<vaadin-combo-box
      class="w-full mt-s"
      label=${this.t(label)}
      value=${this.__getJsonAttribute(attribute) ?? ''}
      .items=${this.__translatedItems(items)}
    ></vaadin-combo-box>`;
  }

  private __renderTextField(attribute: string | Array<string>): TemplateResult {
    const label = typeof attribute == 'string' ? attribute : attribute.join('.');
    return html`<vaadin-text-field
      class="w-full mt-s"
      label=${this.t(label)}
      value=${this.__getJsonAttribute(attribute) ?? ''}
    ></vaadin-text-field>`;
  }

  private __renderTextAreaField(attribute: string | Array<string>): TemplateResult {
    const label = typeof attribute == 'string' ? attribute : attribute.join('.');
    return html`
      <vaadin-text-area
        class="w-full mt-s"
        label=${this.t(label)}
        value=${this.__getJsonAttribute(attribute) ?? ''}
      ></vaadin-text-area>
    `;
  }

  private __usageAnalytics(ev: CustomEvent) {
    this.__enabledAnalytics = ev.detail;
    this.__setJsonAttribute(['analytics_config', 'usage'], ev.detail ? 'required' : 'none');
    if (!ev.detail) {
      this.__setIncludeViaLoader(false);
    }
  }

  private __setIncludeViaLoader(value: boolean) {
    this.__setJsonAttribute(['analytics_config', 'google_analytics', 'include_on_site'], value);
    this.__includeViaLoader = value;
  }

  private __addHiddenProductOption(): void {
    this.__hiddenProductOptions = [...this.__hiddenProductOptions, ''];
  }

  private __addCustomConfig(key: string, value: any): void {
    this.__customConfig = { ...this.__customConfig, key: value };
  }

  private __renderBillingField(field: string): TemplateResult {
    return html` <vaadin-combo-box
      label=${field}
      value=${this.__getJsonAttribute(field) ?? ''}
      .items=${['required', 'option', 'hidden', 'default']}
    ></vaadin-combo-box>`;
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

  private _setCustomizeState(ev: CustomEvent) {
    this.__customizeTemplate = ev.detail;
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
}
