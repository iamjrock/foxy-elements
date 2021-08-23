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
  selected_regions: Array<Region>;
}

export class CountryWidget extends Base<Data> {
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
      __selectedCountry: { attribute: false, type: Object },
      __selectedRegions: { attribute: false, type: Array },
    };
  }

  public value: CountryValue | undefined;

  private __allRegions = true;

  private static __regionsQuery = '?include_regions';

  private __selectedCountry: Country | null = null;

  private __selectedRegions: Array<string> = [];

  render(): TemplateResult {
    return html`
      <x-dropdown
        label="country"
        data-testid="countries"
        ?disabled=${!this.data}
        @change=${this.__handleChangeEventCountry.bind(this)}
        .getText=${(v: string) => this.t(v)}
        .items=${this.data && typeof this.data !== 'string'
          ? Object.values(this.data).map((c: any) => c.cc2)
          : []}
      >
      </x-dropdown>
      ${this.__selectedCountry &&
      this.__selectedCountry.regions &&
      !Array.isArray(this.__selectedCountry.regions)
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
                : Object.values(this.__selectedCountry.regions).map((r: Region) =>
                    this.__renderRegionInput(r)
                  )}
            </div>
          `
        : html``}
    `;
  }

  private __renderRegionInput(region: Region): TemplateResult {
    if (
      this.__selectedCountry &&
      !Array.isArray(this.__selectedCountry.regions) &&
      this.__selectedCountry.regions
    ) {
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
            key="${this.__selectedCountry.cc2}.${region.c}"
          ></foxy-i18n>
        </x-checkbox>
      `;
    } else {
      return html``;
    }
  }

  private __hasRegions() {
    if (
      !this.__selectedCountry ||
      this.__selectedCountry.has_regions === false ||
      Array.isArray(this.__selectedCountry.regions)
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
    return (this.__selectedCountry!.regions as Record<string, Region>)[c];
  }

  private __handleChangeEventCountry(ev: CustomEvent) {
    this.__selectedCountry = this.__getCountry(ev.detail);
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
    const value = {
      ...this.__selectedCountry!,
      selected_regions: this.__allRegions
        ? '*'
        : this.__selectedRegions.map(r => this.__getRegion(r) as Region)!,
    };
    console.log(value);
    this.dispatchEvent(new CustomEvent('change', { detail: value }));
  }
}
