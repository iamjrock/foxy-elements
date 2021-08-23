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
  selected_region: Region;
}

export class CountryWidget extends Base<Data> {
  static get scopedElements(): ScopedElementsMap {
    return {
      'vaadin-combo-box': customElements.get('vaadin-combo-box'),
    };
  }

  static get properties(): PropertyDeclarations {
    return {
      ...super.properties,
      __selectedCountry: { attribute: false, type: Object },
    };
  }

  public value: CountryValue | undefined;

  private static __regionsQuery = '?include_regions';

  private __selectedCountry: Country | null = null;

  private __selectedRegion: Region | null = null;

  render(): TemplateResult {
    return html`
      <vaadin-combo-box
        label="country"
        data-testid="countries"
        ?disabled=${!this.data}
        @change=${this.__handleChangeEventCountry.bind(this)}
        .items=${this.data && typeof this.data !== 'string'
          ? Object.values(this.data).map((c: any) => c.cc2)
          : []}
      >
      </vaadin-combo-box>
      ${this.__selectedCountry &&
      this.__selectedCountry.regions &&
      !Array.isArray(this.__selectedCountry.regions)
        ? html`
            <vaadin-combo-box
              label="region"
              data-testid="regions"
              .items=${Object.values(this.__selectedCountry.regions).map(r => r.c)}
            ></vaadin-combo-box>
          `
        : ''}
    `;
  }

  private __hasRegions() {
    // When a country have regions
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

  private __getRegion(c: string) {
    if (!this.__hasRegions()) {
      return null;
    }
    return (this.__selectedCountry!.regions as Record<string, any>)[c];
  }

  private __handleChangeEventCountry(ev: Event) {
    this.__selectedCountry = this.__getCountry((ev.target as HTMLInputElement).value);
  }

  private __handleChangeEventRegion(ev: Event) {
    this.__selectedRegion = this.__getRegion((ev.target as HTMLInputElement).value);
  }

  private __handleChange() {
    this.value = {
      ...this.__selectedCountry!,
      selected_region: this.__selectedRegion!,
    };
    this.dispatchEvent(new Event('change'));
  }
}
