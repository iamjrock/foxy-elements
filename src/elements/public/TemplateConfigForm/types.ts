import { Rels } from '@foxy.io/sdk/backend';
import { Resource } from '@foxy.io/sdk/core';

type DHOR = 'default' | 'hidden' | 'option' | 'required';

export interface TemplateConfigJson {
  cart_type: 'default' | 'fullpage' | 'custom';
  checkout_type: 'default_account' | 'default_guest' | 'guest_only' | 'account_only';
  csc_requirements: 'all_cards' | 'sso_only' | 'new_cards_only';
  tos_checkbox_settings: {
    usage: 'none' | 'required' | 'optional';
    initial_state: 'checked' | 'unchecked';
    is_hidden: boolean;
    url: string;
  };
  eu_secure_data_transfer_consent: {
    usage: 'none' | 'required';
  };
  newsletter_subscribe: {
    usage: 'none' | 'required';
  };
  analytics_config: {
    usage: 'none' | 'required';
    google_analytics: {
      usage: 'none' | 'required';
      account_id: string;
      include_on_site: boolean;
    };
  };
  colors: {
    usage: 'none' | 'required';
    primary: string;
    secondary: string;
    tertiary: string;
  };
  use_checkout_confirmation_window: {
    usage: 'none' | 'required';
  };
  supportted_payment_cards: Array<
    'visa' | 'mastercard' | 'discover' | 'amex' | 'dinersclub' | 'maestro' | 'laser'
  >;
  custom_checkout_field_requirements: {
    cart_controls: 'enabled' | 'disabled';
    coupon_entry: 'enabled' | 'disabled';
    billing_first_name: DHOR;
    billing_last_name: DHOR;
    billing_company: DHOR;
    billing_tax_id: DHOR;
    billing_phone: DHOR;
    billing_address1: DHOR;
    billing_address2: DHOR;
    billing_city: DHOR;
    billing_region: DHOR;
    billing_postal_code: DHOR;
    billing_country: DHOR;
  };
  cart_display_config: {
    usage: 'none' | 'required';
    hidden_product_options: Array<string>;
    show_product_weight: boolean;
    show_product_category: boolean;
    show_product_code: boolean;
    show_product_options: boolean;
    show_sub_frequency: boolean;
    show_sub_startdate: boolean;
    show_sub_nextdate: boolean;
    show_sub_enddate: boolean;
  };
  foxycomplete: {
    usage: 'none' | 'required';
    show_combobox: boolean;
    show_flags: boolean;
    combobox_open: string;
    combobox_close: string;
  };
  custom_script_values: {
    header: string;
    footer: string;
    checkout_fields: string;
    multiship_checkout_fields: string;
  };
  custom_config: string;
  debug: {
    usage: 'none' | 'required';
  };
  location_filtering: {
    usage: 'none' | 'shipping' | 'billing' | 'both' | 'independent';
    shipping_filter_type: 'blacklist' | 'whitelist';
    billing_filter_type: 'blacklist' | 'whitelist';
    shipping_filter_values: [] | Record<string, Array<string>>;
    billing_filter_values: [] | Record<string, Array<string>>;
  };
  postal_code_lookup: {
    usage: 'none' | 'required';
  };
}

export type Item = Resource<Rels.TemplateConfig>;
