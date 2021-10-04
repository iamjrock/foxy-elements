import { Checkbox, Dropdown, I18N } from '../../private';
import { CSSResultArray, PropertyDeclarations, TemplateResult, css, html } from 'lit-element';
import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { ComboBoxElement } from '@vaadin/vaadin-combo-box';
import { ComboBoxLightElement } from '@vaadin/vaadin-combo-box/vaadin-combo-box-light';
import { ConfigurableMixin } from '../../../mixins/configurable';
import { Data } from './types';
import { NucleonElement } from '../NucleonElement';
import { ThemeableMixin } from '../../../mixins/themeable';
import { TextFieldElement } from '@vaadin/vaadin-text-field';
import { TranslatableMixin } from '../../../mixins/translatable';

const NS = 'country-region';

const Base = ScopedElementsMixin(
  ThemeableMixin(ConfigurableMixin(TranslatableMixin(NucleonElement, NS)))
);

interface Region {
  n: string;
  c: string;
  alt: string[];
  boost: number;
  active: boolean;
}

interface Country {
  cc2: string;
  active: boolean;
  regions_required: boolean;
  has_regions?: boolean;
  regions: [] | Record<string, Region>;
}

export interface CountryValue extends Country {
  selected_regions: Array<Region> | '*';
}

export type RegionValue = Region;

export class CountryWidget extends Base<Data> {
  static CountryData: Data | null = null;

  static get scopedElements(): ScopedElementsMap {
    return {
      'foxy-i18n': I18N,
      'vaadin-combo-box': ComboBoxElement,
      'vaadin-combo-box-light': ComboBoxLightElement,
      'vaadin-text-field': TextFieldElement,
      'x-checkbox': Checkbox,
      'x-dropdown': Dropdown,
    };
  }

  static get styles(): CSSResultArray {
    return [
      ...super.styles,
      css`
        #country {
        }
        #country::part(text-field) {
        }
        #countries {
          padding: 55px;
          background: blue;
        }
        option {
          background: yellow;
          padding: 1em;
        }
      `,
    ];
  }

  static get properties(): PropertyDeclarations {
    return {
      ...super.properties,
      __allRegions: { attribute: false, type: Boolean },
      __selectedRegions: { attribute: false, type: Array },
      country: {
        converter: v => {
          if (v) {
            if (CountryWidget.CountryData != null) {
              return { ...(CountryWidget.CountryData as any)[v] };
            } else {
              return { cc2: v };
            }
          }
          return null;
        },
      },
      omit: { type: Array },
      regions: { type: Array },
      style: { type: String },
    };
  }

  public value: CountryValue | undefined;

  public omit: string[] = [];

  private country: Country | null = null;

  private regions: Array<string> = [];

  private __allRegions = true;

  private static __regionsQuery = '?include_regions';

  private __selectedRegions: Array<string> = [];

  constructor() {
    super();
    if (CountryWidget.CountryData) {
      this.data = CountryWidget.CountryData;
    }
    this.addEventListener('update', () => {
      if (this.data) {
        CountryWidget.CountryData = this.data;
      }
    });
  }

  render(): TemplateResult {
    return html`
      <div class="border rounded border-contrast-10">
        <div>${this.__renderCountryInput()}</div>
        ${this.country && this.country.regions && !Array.isArray(this.country.regions)
          ? html`<div>${this.__renderRegionsInput()}</div>`
          : html``}
      </div>
    `;
  }

  public setCountry(cc2: string): void {
    if (this.data) {
      this.country = this.__getCountry(cc2);
    }
  }

  public setRegions(regions: string[]): void {
    if (this.data) {
      this.__selectedRegions = regions.filter(i => !!i);
    }
  }

  public removeRegion(region: string): void {
    if (this.data) {
      this.setRegions(this.__selectedRegions.filter(i => i !== region));
    }
  }

  __renderCountryInput(): TemplateResult {
    const currentCountry = this.country ? this.country.cc2 : 'no value';
    return html`
      <vaadin-combo-box-light
        theme="custom-border"
        item-value-path="code"
        item-label-path="text"
        .items=${this.data && typeof this.data !== 'string'
          ? Object.values(this.data)
              .map((c: any) => c.cc2)
              .filter((c: string) => !!c && (!this.omit.includes(c) || c == currentCountry))
              .map((c: string) => ({
                code: `${c}`,
                text: `${this.t(`${c.toLowerCase()}.text`)} ${c}`,
              }))
          : []}
        @value-changed=${this.__handleChangeEventCountry.bind(this)}
        label="Label"
      >
        ${this.__tagStyleBackgroundWhite()}
        <vaadin-text-field class="p-s" placeholder="choose_country"></vaadin-text-field>
      </vaadin-combo-box-light>
    `;
  }

  __renderRegionsInput(): TemplateResult {
    if (!this.country) return html``;
    return html`
      <div class="border border-b border-contrast-10 flex flex-wrap items-center">
        ${this.__selectedRegions.map(i => this.__renderRegionPill(i))}
        <vaadin-combo-box-light
          id="region-input"
          data-testid="region-input"
          theme="custom-border"
          item-value-path="code"
          item-label-path="text"
          .items=${Object.values(this.country.regions)
            .map((c: any) => c.c)
            .filter((c: string) => !this.__selectedRegions.includes(c))
            .map((c: string) => ({
              code: `${c}`,
              text: `${this.t(`${c.toLowerCase()}.text`)} ${c}`,
            }))}
          @value-changed=${this.__handleChangeEventRegion.bind(this)}
          label="Label"
        >
          ${this.__tagStyleBackgroundWhite()}
          <vaadin-text-field placeholder="${this.t('choose_region')}"></vaadin-text-field>
        </vaadin-combo-box-light>
      </div>
    `;
  }

  private __renderRegionPill(value: string, tpl: TemplateResult = html`${value}`) {
    return html`
      <div
        style="width: 16ch"
        class="border rounded-l-l rounded-r-l border-contrast-10 px-s ml-s my-s flex"
      >
        <div class="text-center flex-grow flex">
          <div class="region-name flex-grow">${this.t(`${value}.name`)}</div>
          <div class="region-code text-disabled">${tpl}</div>
        </div>
        <button @click=${() => this.removeRegion(value)}>×</button>
      </div>
    `;
  }

  private __tagStyleBackgroundWhite() {
    return html`
      <style>
        vaadin-text-field::part(input-field) {
          background-color: white;
        }
      </style>
    `;
  }

  private __hasRegions() {
    if (
      !this.country ||
      this.country.has_regions === false ||
      Array.isArray(this.country.regions)
    ) {
      return false;
    }
    return true;
  }

  private __getCountry(cc2: string) {
    if (!this.data) {
      return null;
    }
    return (this.data as any)[cc2] as Country;
  }

  private __getRegion(c: string): Region | null {
    if (!this.__hasRegions()) {
      return null;
    }
    return (this.country!.regions as Record<string, Region>)[c];
  }

  private __handleChangeEventCountry(ev: CustomEvent) {
    this.country = this.__getCountry(ev.detail.value);
    this.__allRegions = true;
    this.__selectedRegions = [];
    this.__handleChange();
  }

  private __handleChangeEventRegion(ev: CustomEvent) {
    if (!this.__selectedRegions.includes(ev.detail.value)) {
      this.setRegions([...this.__selectedRegions, ev.detail.value]);
      this.__handleChange();
    }
    (this.shadowRoot?.querySelector('#region-input') as HTMLInputElement).value = '';
  }

  private __handleChange() {
    this.__allRegions = this.__selectedRegions.length === 0;
    this.__setValue();
    this.dispatchEvent(new CustomEvent('change', { detail: this.value }));
  }

  private __setValue() {
    this.value = {
      ...this.country!,
      selected_regions: this.__allRegions
        ? '*'
        : this.__selectedRegions.map(r => this.__getRegion(r) as Region)!,
    };
  }
}
