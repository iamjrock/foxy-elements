import { Translatable } from '../../../mixins/translatable';
import { QuickOrderProduct } from './types';
import { html, property } from 'lit-element';
import { Checkbox, Section, Group, I18N } from '../../private/index';

/**
 * This component allows a user to configure a product.
 *
 * The product may be configured using HTML properties or a JS object.
 * Relevant properties are mapped to a QuickOrderProduct object that is used by
 * the QuickOrderForm.
 *
 * The product id may be set manually by the user or created automatically by the component.
 * An error is thrown if an attempt is made to create two products with the same id.
 */
export class ProductItem extends Translatable {
  // A list of product properties as defined in Foxy Cart Documentation
  private static productProperties = Object.keys(EmptyProduct);

  public static get scopedElements() {
    return {
      'x-checkbox': Checkbox,
      'x-section': Section,
      'x-group': Group,
      'x-number-field': customElements.get('vaadin-number-field'),
      'x-i18n': I18N,
    };
  }

  private static __existingIds: number[] = [];

  private static __newId() {
    // Get the maximum value
    const newId =
      ProductItem.__existingIds.reduce((accum, curr) => (curr > accum ? curr : accum), 0) + 1;
    ProductItem.__addCustomId(newId);
    return newId;
  }

  private static __addCustomId(customId: string | number) {
    const newId = Number(customId);
    if (ProductItem.__existingIds.includes(newId)) {
      throw new Error('Attempt to create two different products with the same id');
    }
    ProductItem.__existingIds.push(newId);
  }

  private __vocabulary = {
    remove: 'Remove',
  };

  public constructor() {
    super('quick-order');
  }

  private get __isChildProduct() {
    return !!this.value?.parent_code;
  }

  /** LitElement life cicle */
  public firstUpdated(): void {
    this.__propertyToValue();
    this.__setId();
    this.__setCode();
    this.__setParentCode();
    this.__createChildren();
  }

  private __default_image = {
    src: 'https://www.foxy.io/merchants/shopping-cart-full.svg',
    alt: 'A sketch of a shopping cart with three boxes',
  };

  public value: QuickOrderProduct | undefined;

  @property({ type: String })
  public name?: string;

  @property({ type: String })
  public price?: number;

  @property({ type: String })
  public image?: string;

  @property({ type: String })
  public url?: string;

  @property({ type: String, reflect: true })
  public code?: string | number;

  @property({ type: String })
  public parent_code?: string;

  @property({ type: String })
  public quantity?: number;

  @property({ type: String })
  public quantity_max?: number;

  @property({ type: String })
  public quantity_min?: number;

  @property({ type: String })
  public category?: string;

  @property({ type: String })
  public expires?: string;

  @property({ type: String })
  public weight?: string;

  @property({ type: String })
  public length?: number;

  @property({ type: String })
  public width?: number;

  @property({ type: String })
  public height?: number;

  @property({ type: String })
  public shipto?: string;

  @property({ type: String })
  alt?: string;

  @property({ type: Boolean, reflect: true })
  product = true;

  public render(): TemplateResult {
    return html`
      <article class="product flex flex-row flex-wrap justify-between overflow-hidden">
        <img
          class="max-w-xs min-w-1 block"
          alt="${this.value?.alt ?? this.__default_image.alt}"
          src="${this.value?.image ?? this.__default_image.src}"
        />
        <x-section class="description flex flex-wrap flex-column p-s min-w-xl">
          <h1>${this.value?.name}</h1>
          <div class="product-description">${this.value?.description}</div>
        </x-section>
        <x-section class="item-info p-s min-w-2">
          <div class="price">${this.value?.price}</div>
        </x-section>
        ${this.__isChildProduct
          ? ''
          : html` <x-section class="actions p-s min-w-3">
              <x-number-field value="1" min="0" has-controls></x-number-field>
              <x-checkbox data-testid="toggle">${this.__vocabulary.remove}</x-checkbox>
            </x-section>`}
        <slot></slot>
      </article>
    `;
  }

  private __setId() {
    if (!this.value?.id) {
      this.value!.id = ProductItem.__newId();
    } else {
      // The user provided a custom id
      ProductItem.__addCustomId(this.value!.id);
    }
  }

  private __setCode() {
    if (!this.code && this.value && !this.value.code) {
      this.value.code = `RAND${Math.random()}`;
      this.code = this.value!.code;
    }
  }

  private __setParentCode() {
    const productParent = this.parentElement;
    if (productParent?.hasAttribute('product')) {
      this.value!.parent_code = (productParent as ProductItem).value?.code;
    }
  }

  /** Captures values set as properties to build the value property of the component.  */
  private __propertyToValue() {
    if (this.value === undefined) {
      if (this.name && this.price) {
        this.value = {
          name: this.name,
          price: this.price,
        };
      } else {
        console.error('The name and price attributes of a product are required.', {
          name: this.name,
          price: this.price,
        });
      }
    }
    const productProperties = [
      'name',
      'price',
      'image',
      'url',
      'code',
      'parent_code',
      'quantity',
      'quantity_max',
      'quantity_min',
      'category',
      'expires',
      'weight',
      'length',
      'width',
      'height',
      'shipto',
      'id',
      'alt',
    ];
    for (const i of productProperties) {
      if (!(this.value![i] as string | null)) {
        this.value![i] = this.getAttribute(i);
      }
    }
  }
}
