import { CSSResultArray, PropertyDeclarations, TemplateResult, css, html } from 'lit-element';
import { Checkbox, Choice, Group } from '../../private/index';
import {
  CountryValue,
  CountryWidget,
  RegionValue,
} from '../CountryRegionWidget/CountryRegionWidget';
import { Item, TemplateConfigJson } from './types';
import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { ConfigurableMixin } from '../../../mixins/configurable';
import { DetailsElement } from '@vaadin/vaadin-details';
import { InternalConfirmDialog } from '../../internal/InternalConfirmDialog';
import { ItemElement } from '@vaadin/vaadin-item';
import { ListBoxElement } from '@vaadin/vaadin-list-box';
import { NucleonElement } from '../NucleonElement';
import { NucleonV8N } from '../NucleonElement/types';
import { ThemeableMixin } from '../../../mixins/themeable';
import { TranslatableMixin } from '../../../mixins/translatable';
import { classMap } from '../../../utils/class-map';
import memoize from 'lodash-es/memoize';

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
      sections: { attribute: false, type: Array },
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
    };
  }

  static get v8n(): NucleonV8N<Item> {
    return [
      ({ description: v }) => !v || v.length <= 100 || 'first_name_too_long',
      ({ json: v }) => !v || v.length <= 50 || 'content_invalid',
    ];
  }

  sections: Array<'cart' | 'checkout' | 'website'> = [];

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

  firstUpdated(): void {
    const el = this.shadowRoot?.querySelector('#hidden_product_options');
    if (el) {
      this.__hiddenOptionsElement = el;
    }
  }

  render(): TemplateResult {
    return !this.in('idle')
      ? this.__renderSpinner()
      : html`
          ${this.sections.includes('cart') || this.sections.length == 0
            ? this.__renderCart()
            : html``}
          ${this.sections.includes('checkout') || this.sections.length == 0
            ? this.__renderCheckout()
            : html``}
          ${this.sections.includes('website') || this.sections.length == 0
            ? this.__renderWebsite()
            : html``}
        `;
  }

  private __renderSpinner(): TemplateResult {
    const isBusy = this.in('busy');
    const isFail = this.in('fail') || !this.__countriesURL();
    return html`
      <div
        data-testid="spinner"
        class=${classMap({
          'transition duration-500 ease-in-out absolute inset-0 flex': true,
          'opacity-0 pointer-events-none': !isBusy && !isFail,
        })}
      >
        <foxy-spinner
          layout="vertical"
          class="m-auto p-m bg-base shadow-xs rounded-t-l rounded-b-l"
          state=${isFail ? 'error' : isBusy ? 'busy' : 'empty'}
          lang=${this.lang}
          ns="${this.ns} ${customElements.get('foxy-spinner')?.defaultNS ?? ''}"
        >
        </foxy-spinner>
      </div>
    `;
  }

  private __renderCart() {
    return html`
      ${this.__renderCartType()} ${this.__renderCartConfigFoxyComplete()}
      ${this.__renderCartConfig()}
    `;
  }

  private __countriesURL(): string {
    try {
      return new URL(this.href).origin + TemplateConfigForm.countriesHelperPath;
    } catch (e) {
      console.error('Check the href attribute, it must be a valid URL', e);
      // return a harmless valid URL
      return '';
    }
  }

  private __renderWebsite() {
    return html` ${this.__renderYourWebsiteAnalytics()} ${this.__renderYourWebsiteDebug()} `;
  }

  private __renderAdvanced() {
    return html`
      ${this.__renderYourWebsiteCustomVariables()} ${this.__renderCartConfigHeaderFooter()}
    `;
  }

  private __renderCheckout() {
    return html`
      ${this.__renderCombo(
        'checkout_type.title',
        [
          'checkout_type.default_account',
          'checkout_type.account_only',
          'checkout_type.default_guest',
          'checkout_type.guest_only',
        ],
        'checkout_type.default_account'
      )}
      <x-group frame class="mt-m">
        <foxy-i18n
          slot="header"
          class="mx-s"
          key="tos_checkbox_settings.title"
          lang=${this.lang}
          ns=${this.ns}
        >
        </foxy-i18n>
        <div class="p-m">
          <vaadin-combo-box
            class="w-full mt-s"
            label=${this.t('tos_checkbox_settings.label')}
            value=${this.__getTosCheckboxSettingsOptionValue()}
            .items=${this.__translatedItems([
              'disabled',
              'optional-default-checked',
              'optional-default-checked-hidden',
              'optional-default-unchecked',
              'optional-default-unchecked-hidden',
              'required-default-checked',
              'required-default-checked-hidden',
              'required-default-unchecked',
              'required-default-unchecked-hidden',
            ])}
          ></vaadin-combo-box>
          <vaadin-text-field
            ?disabled=${this.__getTosCheckboxSettingsOptionValue() == 'disabled'}
            class="w-full mt-m"
            label="tos_checkbox_settings-url"
          >
          </vaadin-text-field>
        </div>
      </x-group>
      <x-group frame>
        <div class="p-m">
          ${this.__renderUsageCheckbox(
            ['custom_checkout_field_requirements', 'cart_controls'],
            ['enabled', 'disabled']
          )}
          ${this.__renderUsageCheckbox(
            ['custom_checkout_field_requirements', 'coupon_entry'],
            ['enabled', 'disabled']
          )}
          ${this.__renderUsageCheckbox(['eu_secure_data_transfer_consent', 'usage'])}
          ${this.__renderUsageCheckbox(['newsletter_subscribe', 'usage'])}
        </div>
      </x-group>
      <x-group class="mt-m" frame>
        <foxy-i18n
          slot="header"
          class="mx-s"
          key="creditcard_config.title"
          lang=${this.lang}
          ns=${this.ns}
        >
        </foxy-i18n>
        <div class="p-m">
          <vaadin-list-box
            label="support_payment_cards.usage"
            value=${this.__getJsonAttribute('use_checkout_confirmation_window-usage') ?? ''}
            multiple
          >
            ${['visa', 'mastercard', 'discover', 'amex', 'dinersclub', 'maestro', 'laser'].map(
              card => html`
                <vaadin-item name="${card}">
                  <foxy-i18n
                    key="support_payment_cards.${card}"
                    ns=${this.ns}
                    lang=${this.lang}
                  ></foxy-i18n>
                </vaadin-item>
              `
            )}
          </vaadin-list-box>
        </div>
        <div class="m-s">
          ${this.__renderCombo('csc_requirements.title', [
            'csc_requirements.all_cards',
            'csc_requirements.sso_only',
            'csc_requirements.new_cards_only',
          ])}
        </div>
      </x-group>
      <x-group class="mt-m" frame>
        <foxy-i18n
          slot="header"
          class="mx-s"
          key="custom_checkout_field_requirements.title"
          lang=${this.lang}
          ns=${this.ns}
        >
        </foxy-i18n>
        <x-group class="mt-m">
          <foxy-i18n
            slot="header"
            class="mx-s"
            key="custom_checkout_field_requirements.title-billing-shipping"
            lang=${this.lang}
            ns=${this.ns}
          >
          </foxy-i18n>
          <div class="p-s grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-s md:gap-m">
            ${['company', 'tax_id', 'phone', 'address2'].map(i =>
              this.__renderBillingField(`custom_checkout_field_requirements.billing_${i}`)
            )}
          </div>
        </x-group>
        <x-group class="mt-m">
          <foxy-i18n
            slot="header"
            class="mx-s"
            key="custom_checkout_field_requirements.title-billing"
            lang=${this.lang}
            ns=${this.ns}
          >
          </foxy-i18n>
          <div class="p-s grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-s md:gap-m">
            ${[
              'first_name',
              'last_name',
              'address1',
              'city',
              'region',
              'postal_code',
              'country',
            ].map(i =>
              this.__renderBillingField(`custom_checkout_field_requirements.billing_${i}`)
            )}
          </div>
        </x-group>
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
    return html`
      <x-group frame class="mt-m">
        <foxy-i18n
          slot="header"
          key="cart_display.title"
          lang="${this.lang}"
          ns="${this.ns}"
        ></foxy-i18n>
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
      ${this.__renderCartConfigFoxyComplete()} ${this.__renderCartFilter()}
      <x-group class="mt-m" frame>
        <foxy-i18n slot="header" key="colors.title" lang=${this.lang} ns=${this.ns}></foxy-i18n>
        <div class="p-m">
          ${this.__renderTextField(['colors', 'primary'])}
          ${this.__renderTextField(['colors', 'secondary'])}
          ${this.__renderTextField(['colors', 'tertiary'])}
        </div>
      </x-group>
    `;
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
          ${this.__getJsonAttribute(['location_filtering', 'usage']) === 'independent'
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
    const valuesList =
      this.__getJsonAttribute([
        'location_filtering',
        `${which == 'billing' ? 'billing' : 'shipping'}_filter_values`,
      ]) ?? {};
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
        ${[...Object.entries(valuesList), ['', []]].map(([k, v]) => {
          return html`
            <foxy-country-widget
              class="mt-m"
              data-locationsfiltering-input="${which}"
              @change=${this.__handleLocationFilteringChange}
              country="${k}"
              regions="${JSON.stringify(v)}"
              omit="${JSON.stringify(Object.keys(valuesList))}"
              href="${this.__countriesURL()}"
            ></foxy-country-widget>
          `;
        })}
      </x-group>
    `;
  }

  private __handleLocationFilteringChange() {
    if (!this.__json) {
      return;
    }
    const els = this.shadowRoot?.querySelectorAll('[data-locationsfiltering-input]');
    if (!els || els.length == 0) {
      return;
    }
    const values = Array.from(els).reduce((prev, cur) => {
      const countryValue = (cur as CountryWidget).value;
      if (!countryValue) {
        return prev;
      }
      const [k, v] = this.__convertCountryToShippingFilterValue(countryValue);
      const type = cur.getAttribute('data-locationsfiltering-input') as LocationFilteringUsage;
      if (prev[type] === undefined) {
        prev[type] = {};
      }
      if (type != LocationFilteringUsage.none && type != LocationFilteringUsage.independent) {
        (prev as any)[type][k] = v;
      }
      return prev;
    }, {} as any);
    const locationFilterTypes = Object.keys(values);
    if (locationFilterTypes.includes('billing')) {
      this.__setJsonAttribute(['location_filtering', 'billing_filter_values'], values['billing']);
    }
    if (locationFilterTypes.includes('shipping')) {
      this.__setJsonAttribute(['location_filtering', 'shipping_filter_values'], values['shipping']);
    }
    if (locationFilterTypes.includes('both')) {
      this.__setJsonAttribute(['location_filtering', 'usage'], 'both');
      this.__setJsonAttribute(['location_filtering', 'billing_filter_values'], values['both']);
      this.__setJsonAttribute(['location_filtering', 'shipping_filter_values'], values['both']);
    }
  }

  private __computeNewFilteringUsage(): 'shipping' {
    return 'shipping';
  }

  private __convertCountryToShippingFilterValue(country: CountryValue): [string, string[] | '*'] {
    let regions;
    if (country.selected_regions && Array.isArray(country.selected_regions)) {
      if (country.selected_regions.length > 0) {
        regions = country.selected_regions.map((r: RegionValue) => r.c);
      } else {
        regions = [];
      }
    } else {
      regions = '*';
    }
    return [country.cc2, regions as '*' | string[]];
  }

  private __handleLocationFiltering(ev: CustomEvent) {
    if ((ev.target as HTMLInputElement).getAttribute('data-tag-name') === 'x-checkbox') {
      if (ev.detail) {
        this.__setJsonAttribute(['location_filtering', 'usage'], 'independent');
      } else {
        this.__setJsonAttribute(['location_filtering', 'usage'], 'none');
      }
    } else {
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
        ${['header', 'footer', 'checkout_fields', 'multiship_checkout_fields'].map(e =>
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
        <div class="p-m">
          <x-checkbox class="py-s" @change=${this.__handleChangeEnablePostalCode.bind(this)}>
            <foxy-i18n ns=${this.ns} key="postal_code_lookup.enable"></foxy-i18n>
          </x-checkbox>
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

  private __renderUsageCheckbox(attribute: string | string[], yesNo = ['required', 'none']) {
    const label = typeof attribute == 'string' ? attribute : attribute.join('.');
    return html`
      <x-checkbox
        ?checked=${this.__getEnable(attribute, yesNo)}
        @change=${this.__handleChangeEnable(attribute, yesNo)}
      >
        <foxy-i18n class="mx-s" key="${label}" lang=${this.lang} ns=${this.ns}></foxy-i18n>
      </x-checkbox>
    `;
  }

  private __renderCombo(
    attribute: string | Array<string>,
    items: string[],
    defaultValue = ''
  ): TemplateResult {
    const label = typeof attribute == 'string' ? attribute : attribute.join('.');
    return html`<vaadin-combo-box
      class="w-full mt-s"
      label=${this.t(label)}
      value=${this.__getJsonAttribute(attribute) ?? defaultValue}
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
      label=${this.t(field)}
      value=${this.__getJsonAttribute(field) ?? ''}
      .items=${['required', 'option', 'hidden', 'default']}
      .getText=${(v: string) => this.t(v)}
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

  private __handleChangeEnablePostalCode(ev: CustomEvent): void {
    this.__setJsonAttribute(['postal_code_loockup', 'usage'], ev.detail ? 'enabled' : 'none');
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
    if (obj) {
      let cursor = obj;
      for (let k = 0; k < keyList.length - 1; k++) {
        cursor = cursor[keyList[k]];
      }
      cursor[keyList[keyList.length - 1]] = value;
    }
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

  private __getTosCheckboxSettingsOptionValue() {
    return 'disabled';
  }

  /**
   * Retrieves a string value that can only be 'usage' or 'required' as a
   * boolean.
   *
   * @param attribute from this.__json that should only accept "required" or
   * "none" as values.
   * @param yesNo an array with two values, corresponding to the required and
   * none.
   * @returns enabled
   */
  private __getEnable(attribute: string | Array<string>, yesNo = ['required', 'none']): boolean {
    const value = this.__getJsonAttribute(attribute);
    return value == yesNo[0];
  }

  /**
   * Returns a functios that sets a value for an attribute in this__json that
   * can only be 'usage' or 'required', given an event that contains a boolean
   * detail.
   *
   * @param attribute from this.__json that should only accept "required" or
   * "none" as values.
   * @param yesNo an array with two values, corresponding to the required and
   * none.
   * @returns enabled
   */
  private __handleChangeEnable(attribute: string | Array<string>, yesNo = ['required', 'none']) {
    return (ev: CustomEvent) => {
      const value = ev.detail ? yesNo[0] : yesNo[1];
      this.__setJsonAttribute(attribute, value);
    };
  }
}
