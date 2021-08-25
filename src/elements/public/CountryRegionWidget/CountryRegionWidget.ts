import { Checkbox, Dropdown, I18N } from '../../private';
import { PropertyDeclarations, TemplateResult, html } from 'lit-element';
import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { ConfigurableMixin } from '../../../mixins/configurable';
import { Data } from './types';
import { NucleonElement } from '../NucleonElement';
import { ThemeableMixin } from '../../../mixins/themeable';
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
      'x-checkbox': Checkbox,
      'x-dropdown': Dropdown,
    };
  }

  static get properties(): PropertyDeclarations {
    return {
      ...super.properties,
      __allRegions: { attribute: false, type: Boolean },
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
    const currentCountry = this.country ? this.country.cc2 : 'no value';
    return html`
      <x-dropdown
        label="country"
        data-testid="countries"
        ?disabled=${!this.data}
        value="${currentCountry}"
        @change=${this.__handleChangeEventCountry.bind(this)}
        .getText=${(v: string) => this.t(v)}
        .items=${this.data && typeof this.data !== 'string'
          ? Object.values(this.data)
              .map((c: any) => c.cc2)
              .filter((c: string) => !this.omit.includes(c) || c == currentCountry)
          : []}
      >
      </x-dropdown>
      ${this.country && this.country.regions && !Array.isArray(this.country.regions)
        ? html`
            <div class="ml-m mt-s grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-s md:gap-m">
              <x-checkbox
                class="text-s"
                @change=${this.__handleChangeAllRegions}
                ?checked=${this.__allRegions}
              >
                <foxy-i18n lang="${this.lang}" ns="${this.ns}" key="all-regions"></foxy-i18n>
              </x-checkbox>
              ${this.__allRegions
                ? ''
                : Object.values(this.country.regions).map((r: Region) =>
                    this.__renderRegionInput(r)
                  )}
            </div>
          `
        : html``}
    `;
  }

  public setCountry(cc2: string): void {
    if (this.data) {
      this.country = this.__getCountry(cc2);
    }
  }

  public setRegions(regions: string[]): void {
    if (this.data) {
      this.__selectedRegions = regions;
    }
  }

  private __renderRegionInput(region: Region): TemplateResult {
    if (this.country && !Array.isArray(this.country.regions) && this.country.regions) {
      return html`
        <x-checkbox
          class="text-s"
          data-regions-input
          data-testid="region-input-${region.c}"
          data-region="${region.c}"
          @change=${this.__handleChangeEventRegion}
          ?checked=${this.__selectedRegions.includes(region.c)}
        >
          <foxy-i18n
            lang="${this.lang}"
            ns="${this.ns}"
            key="${this.country.cc2}.${region.c}"
          ></foxy-i18n>
        </x-checkbox>
      `;
    } else {
      return html``;
    }
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
    this.country = this.__getCountry(ev.detail);
    this.__allRegions = true;
    this.__selectedRegions = [];
    this.__handleChange();
  }

  private __handleChangeAllRegions(ev: CustomEvent) {
    this.__allRegions = !!ev.detail;
    this.__handleChange();
  }

  private __handleChangeEventRegion() {
    const regions = this.shadowRoot?.querySelectorAll('[data-regions-input]');
    if (regions) {
      const regionsArray = Array.from(regions) as Array<Checkbox>;
      this.__selectedRegions = regionsArray
        .filter((r: Checkbox) => r.checked)
        .map((r: Checkbox) => r.getAttribute('data-region') as string);
    }
    this.__handleChange();
  }

  private __handleChange() {
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
