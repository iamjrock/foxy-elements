import { CSSResultArray, PropertyDeclarations, TemplateResult, css, html } from 'lit-element';
import { Checkbox, Choice, Group } from '../../private/index';
import { Item, TemplateConfigJson } from './types';
import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { ConfigurableMixin } from '../../../mixins/configurable';
import { CountryWidget } from '../CountryRegionWidget/CountryRegionWidget';
import { DetailsElement } from '@vaadin/vaadin-details';
import { InternalConfirmDialog } from '../../internal/InternalConfirmDialog';
import { ItemElement } from '@vaadin/vaadin-item';
import { ListBoxElement } from '@vaadin/vaadin-list-box';
import { NucleonElement } from '../NucleonElement';
import { NucleonV8N } from '../NucleonElement/types';
import { Tabs } from '../../private/Tabs/Tabs';
import { ThemeableMixin } from '../../../mixins/themeable';
import { TranslatableMixin } from '../../../mixins/translatable';
import memoize from 'lodash-es/memoize';

type Tab = { title: string; content: TemplateResult };

const NS = 'template-config-form';

enum LocationFilteringUsage {
  none = 'none',
  shipping = 'shipping',
  billing = 'billing',
  both = 'both',
  independent = 'independent',
}

const Base = ScopedElementsMixin(
  ThemeableMixin(ConfigurableMixin(TranslatableMixin(NucleonElement, NS)))
);

export class TemplateConfigForm extends Base<Item> {
  static countriesHelperPath = '/property_helpers/countries?include_regions';

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
      __cacheSuccess: { attribute: false, type: Boolean },
      __customizeTemplate: { attribute: false, type: Boolean },
      __enabledAnalytics: { attribute: false, type: Boolean },
      __hiddenProductOptions: { attribute: false, type: Array },
      __includeViaLoader: { attribute: false, type: Boolean },
      __json: { attribute: false, type: Object },
    };
  }

  static get scopedElements(): ScopedElementsMap {
    return {
      'foxy-country-widget': CountryWidget,
      'foxy-i18n': customElements.get('foxy-i18n'),
      'foxy-internal-confirm-dialog': customElements.get('foxy-internal-confirm-dialog'),
      'foxy-internal-sandbox': customElements.get('foxy-internal-sandbox'),
      'foxy-spinner': customElements.get('foxy-spinner'),
      'iron-icon': customElements.get('iron-icon'),
      'vaadin-button': customElements.get('vaadin-button'),
      'vaadin-combo-box': customElements.get('vaadin-combo-box'),
      'vaadin-details': DetailsElement,
      'vaadin-item': ItemElement,
      'vaadin-list-box': ListBoxElement,
      'vaadin-text-area': customElements.get('vaadin-text-area'),
      'vaadin-text-field': customElements.get('vaadin-text-field'),
      'x-checkbox': Checkbox,
      'x-choice': Choice,
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

  // This private variable stores as an object the value of this.form.json,
  // which is a stringified object.
  //
  // In order to preserve sync between the string and the object use the
  // __getJsonAttribute and __setJsonAttribute instead of interacting directly
  // with this variable.
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

  private __customConfig: any = {};

  private __stringifying = false;

  private __hiddenOptionsElement: Element | undefined;

  constructor() {
    super();
    this.addEventListener('update', (ev: Event) => {
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

  firstUpdated() {
    const el = this.shadowRoot?.querySelector('#hidden_product_options');
    if (el) {
      this.__hiddenOptionsElement = el;
    }
  }

  private __countriesURL() {
    return new URL(this.href).origin + TemplateConfigForm.countriesHelperPath;
  }

  private __renderTabs(tabs: Array<Tab>): TemplateResult {
    return html` ${this.__stringifying}
      <div class="pt-m">
        <x-tabs size="${tabs.length}">
          ${tabs.map(
            (tab, index) => html`
              <foxy-i18n
                data-testclass="i18n"
                slot="tab-${index}"
                lang="${this.lang}"
                key="${tab.title}"
                ns="${this.ns}"
              ></foxy-i18n>
              <div slot="panel-${index}">${tab.content}</div>
            `
          )}
        </x-tabs>
      </div>`;
  }

  private __renderYourWebsite() {
    return html`
      ${this.__renderYourWebsiteAnalytics()} ${this.__renderYourWebsiteDebug()}
      ${this.__renderYourWebsiteCustomVariables()}
    `;
  }

  private __renderCart() {
    return html` ${this.__renderCartType()} ${this.__renderCartConfig()} `;
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
          <vaadin-list-box label="tos_checkbox_settings-initial_state" theme="horizontal">
            <vaadin-item value="checked">
              <foxy-i18n key="checked"></foxy-i18n>
            </vaadin-item>
            <vaadin-item value="unchecked">
              <foxy-i18n key="unchecked"></foxy-i18n>
            </vaadin-item>
          </vaadin-list-box>
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

  private __renderYourWebsiteAnalytics(): TemplateResult {
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

  private __renderYourWebsiteDebug() {
    return html`
      <div class="p-m">
        <x-checkbox ?checked=${this.__getJsonAttribute('debug-usage') == 'required'}>
          <foxy-i18n key="debug-usage" lang=${this.lang} ns=${this.ns}></foxy-i18n>
        </x-checkbox>
      </div>
    `;
  }

  private __renderYourWebsiteCustomVariables() {
    return html`
      <vaadin-text-area class="w-full" label=${this.t('custom_config')}> </vaadin-text-area>
    `;
  }

  private __renderCartConfig() {
    const cartDisplayConfig =
      this.__getJsonAttribute(['cart_display_config', 'usage']) === 'required';
    return html` <x-group frame>
        <div class="p-m">
          <x-checkbox
            ?checked=${cartDisplayConfig}
            @change=${this.__handleChangeDisplayConfigUsage}
          >
            <foxy-i18n key="cart_display_config.usage" ns=${this.ns}></foxy-i18n>
          </x-checkbox>
          <div class="grid grid-cols-2 gap-xs">
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
                : html` <x-checkbox
                    class="mt-xxs ${!cartDisplayConfig ? 'text-disabled' : ''}"
                    ?checked=${this.__getJsonAttribute('cart_display_config')
                      ? this.__getJsonAttribute(['cart_display_config', `show_${i}`])
                      : false}
                    ?disabled=${!cartDisplayConfig}
                  >
                    <foxy-i18n
                      class="${!cartDisplayConfig ? 'text-disabled' : ''}"
                      key="cart_display_config.show_${i}"
                      lang=${this.lang}
                      ns=${this.ns}
                    ></foxy-i18n>
                  </x-checkbox>`
            )}
          </div>
          ${this.__renderCartConfigHiddenOptions()}
        </div>
      </x-group>
      ${this.__renderCartConfigHeaderFooter()} ${this.__renderCartConfigFoxyComplete()}
      ${this.__renderCartFilter()}
      <x-group frame>
        <div class="p-m">
          <vaadin-combo-box
            label="postalcode_lookup"
            .items=${['none', 'required']}
          ></vaadin-combo-box>
        </div>
      </x-group>`;
  }

  private __renderCartFilter() {
    return html`
      <x-group class="mt-m" frame>
        <foxy-i18n
          key="location_filtering.title"
          slot="header"
          ns=${this.ns}
          lang=${this.lang}
        ></foxy-i18n>
        <div class="p-s">
          <x-checkbox class="py-s" @change=${this.__handleLocationFiltering.bind(this)}>
            <foxy-i18n ns=${this.ns} key="location_filtering.independently"></foxy-i18n>
          </x-checkbox>
          ${this.__getJsonAttribute(['location_filtering', 'usage']) != 'none'
            ? html`
                <div class="grid grid-cols-2 gap-xs">
                  ${this.__renderCartFilterLocationList(LocationFilteringUsage.shipping)}
                  ${this.__renderCartFilterLocationList(LocationFilteringUsage.billing)}
                </div>
              `
            : this.__renderCartFilterLocationList(LocationFilteringUsage.both)}
        </div>
      </x-group>
    `;
  }

  private __renderCartFilterLocationList(which: LocationFilteringUsage) {
    const filterType = `location_filtering.${which}`;
    return html`
      <x-group>
        ${which != 'both'
          ? html`<foxy-i18n
              slot="header"
              key="${filterType}"
              ns=${this.ns}
              lang=${this.lang}
            ></foxy-i18n>`
          : ''}
        <vaadin-list-box>
          <vaadin-item name="filtertype">
            <foxy-i18n
              key="location_filtering.whitelist"
              ns=${this.ns}
              lang=${this.lang}
            ></foxy-i18n>
          </vaadin-item>
          <vaadin-item name="filtertype">
            <foxy-i18n
              key="location_filtering.blacklist"
              ns=${this.ns}
              lang=${this.lang}
            ></foxy-i18n>
          </vaadin-item>
        </vaadin-list-box>
        <foxy-country-widget
          data-locationsfiltering-input="${which}"
          @change=${this.__handleLocationFilteringChange}
          href="${this.__countriesURL()}"
        ></foxy-country-widget>
      </x-group>
    `;
  }

  private __handleLocationFilteringChange() {
    const els = this.shadowRoot?.querySelectorAll('data-locationsfiltering-input');
    if (!els || els.length == 0) {
      return;
    }
    const values = Array.from(els).reduce(
      (prev, cur) => {
        const v = (cur as HTMLInputElement).value;
        const type = cur.getAttribute('data-locationsfiltering-input') as LocationFilteringUsage;
        if (type != LocationFilteringUsage.none && type != LocationFilteringUsage.independent) {
          prev[type].push(v);
        }
        return prev;
      },
      { billing: [], shipping: [], both: [] }
    );
    this.__setJsonAttribute(['']);
  }

  private __handleLocationFiltering(ev: CustomEvent) {
    console.log(ev);
    if ((ev.target as HTMLInputElement).getAttribute('data-tag-name') === 'x-checkbox') {
      console.log('yes');
      if (ev.detail) {
        this.__setJsonAttribute(['location_filtering', 'usage'], 'independent');
      } else {
        this.__setJsonAttribute(['location_filtering', 'usage'], 'none');
      }
    } else {
      console.log('no');
      console.log((ev.target as HTMLInputElement).getAttribute('data-tag-name'));
    }
  }

  private __renderCartConfigHeaderFooter() {
    return html` <x-group frame class="mt-m">
      <foxy-i18n
        slot="header"
        key="custom_script_values.title"
        lang=${this.lang}
        ns=${this.ns}
      ></foxy-i18n>
      <div class="p-s">
        ${['header', 'footer' /*, 'checkout_fields', 'multiship_checkout_fields'*/].map(e =>
          this.__renderTextAreaField(['custom_script_values', e])
        )}
      </div>
    </x-group>`;
  }

  private __renderCartConfigFoxyComplete() {
    return html`
      <x-group class="mt-m" frame>
        <foxy-i18n
          slot="header"
          key="foxycomplete.title"
          ns="${this.ns}"
          lang="${this.lang}"
        ></foxy-i18n>
        <div class="p-m">
          <div class="grid grid-cols-4 gap-s">
            <div class="py-m col-span-3">
              <x-checkbox
                class="py-s"
                @change=${(ev: CustomEvent) =>
                  this.__setJsonAttribute(
                    ['foxycomplete', 'usage'],
                    ev.detail ? 'required' : 'none'
                  )}
              >
                <foxy-i18n ns=${this.ns} key="foxycomplete.usage"></foxy-i18n>
              </x-checkbox>
              <x-checkbox class="py-s">
                <foxy-i18n ns=${this.ns} key="foxycomplete.show_flags"></foxy-i18n>
              </x-checkbox>
              <x-checkbox class="py-s">
                <foxy-i18n ns=${this.ns} key="foxycomplete.show_combobox"></foxy-i18n>
              </x-checkbox>
            </div>
            <div>
              ${this.__renderTextField(['foxycomplete', 'combobox_open'])}
              ${this.__renderTextField(['foxycomplete', 'combobox_close'])}
            </div>
          </div>
        </div>
      </x-group>
    `;
  }

  private __renderCartConfigHiddenOptions() {
    let hiddenProductOptions = this.__getJsonAttribute([
      'cart_display_config',
      'hidden_product_options',
    ]);
    if (hiddenProductOptions === undefined) {
      hiddenProductOptions = [];
    }
    return html` <x-group frame>
      <div class="p-s">
        <foxy-i18n
          slot="header"
          key="cart_display_config.hidden_product_options"
          ns=${this.ns}
        ></foxy-i18n>
        <div id="hidden_product_options">
          ${hiddenProductOptions.map(
            (e: string, i: number) => html`
              <vaadin-text-field
                data-hidden-option
                name="hidden_product_options-${i}"
                .value=${hiddenProductOptions[i]}
                @change=${this.__handleChangeHiddenProductOptions}
                class="w-full pt-s"
              >
              </vaadin-text-field>
            `
          )}
          <vaadin-text-field
            data-hidden-option
            name="hidden_product_options-${hiddenProductOptions.length}"
            @change=${(ev: CustomEvent) => {
              this.__handleChangeHiddenProductOptions();
              this.__blank(ev);
            }}
            class="w-full pt-s"
          >
          </vaadin-text-field>
        </div>
      </div>
    </x-group>`;
  }

  private __blank(ev: CustomEvent): void {
    (ev.target as HTMLInputElement).value = '';
  }

  private __renderCartType(): TemplateResult {
    return html`
      <x-choice
        data-testid="cart-type"
        lang=${this.lang}
        ns=${this.ns}
        .items=${['default', 'fullpage', 'custom']}
        .value=${this.__getJsonAttribute('cart_type')}
        @change=${this.__handleChangeCartType}
        .getText=${(v: string) => this.t(`cart_type.${v}`)}
      >
      </x-choice>
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

  private __handleChangeCartType(ev: CustomEvent) {
    if (this.__json && ['fullpage', 'custom', 'default'].includes(ev.detail)) {
      this.__json = { ...this.__json, cart_type: ev.detail };
    }
  }

  private __handleChangeDisplayConfigUsage(ev: CustomEvent) {
    if (this.__json) {
      this.__setJsonAttribute(['cart_display_config', 'usage'], ev.detail ? 'required' : 'none');
    }
  }

  private __handleChangeHiddenProductOptions() {
    const attr = ['cart_display_config', 'hidden_product_options'];
    if (this.__hiddenOptionsElement) {
      const newValue = Array.from(
        this.__hiddenOptionsElement.querySelectorAll('[data-hidden-option]')
      )
        .map(e => (e as HTMLInputElement).value)
        .filter((v: string) => !!v)
        .filter((v: string) => !v.match(/^\s*$/));
      this.__setJsonAttribute(attr, newValue);
    }
  }

  private __getJsonAttribute(attribute: string | Array<string>): any {
    this.__deStringify();
    if (!this.__json) {
      return undefined;
    }
    if (typeof attribute === 'string') {
      return this.__json![attribute as keyof TemplateConfigJson];
    } else {
      return attribute.reduce((acc, cur) => (acc! as any)[cur], this.__json);
    }
  }

  private __setJsonAttribute(attribute: string | Array<string>, value: any): void {
    this.__deStringify();
    if (!this.__json) {
      return;
    }
    if (typeof attribute === 'string') {
      this.__json![attribute as keyof TemplateConfigJson] = value as never;
    } else {
      this.__deepSet(this.__json as Record<string, any>, attribute, value);
    }
    this.__json = { ...this.__json };
    this.__stringifying = true;
    this.__stringify().then(() => {
      this.__stringifying = false;
    });
  }

  private __deepSet(obj: Record<string, any>, keyList: string[], value: any) {
    let cursor = obj;
    for (let k = 0; k < keyList.length - 1; k++) {
      cursor = cursor[keyList[k]];
    }
    cursor[keyList[keyList.length - 1]] = value;
  }

  private __deStringify() {
    if (!this.__json) {
      if (this.form.json) {
        this.__json = JSON.parse(this.form.json);
      }
    }
  }

  private async __stringify() {
    this.form.json = JSON.stringify(this.__json);
    return true;
  }
}
