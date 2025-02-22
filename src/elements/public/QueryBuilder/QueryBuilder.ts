import { CSSResultArray, LitElement, PropertyDeclarations, TemplateResult } from 'lit-element';
import { Operator, Option, Type } from './types';

import { Group } from './components/Group';
import { ResponsiveMixin } from '../../../mixins/responsive';
import { ThemeableMixin } from '../../../mixins/themeable';
import { TranslatableMixin } from '../../../mixins/translatable';
import { parse } from './utils/parse';
import { stringify } from './utils/stringify';
import { styles } from './styles';

const NS = 'query-builder';
const Base = ResponsiveMixin(ThemeableMixin(TranslatableMixin(LitElement, NS)));

/**
 * UI component for creating Foxy hAPI filters visually. Compatible with
 * Backend API, Customer API or any other API using the same format as described
 * in our [docs](https://api.foxy.io/docs/cheat-sheet).
 *
 * @element foxy-query-builder
 * @since 1.12.0
 */
class QueryBuilder extends Base {
  /** QueryBuilder dispatches this event on itself when value changes. */
  static readonly ChangeEvent = class extends CustomEvent<void> {};

  /** Operator dictionary for use in autocomplete options. */
  static readonly Operator = Operator;

  /** Field type dictionary for use in autocomplete options. */
  static readonly Type = Type;

  static get properties(): PropertyDeclarations {
    return {
      ...super.properties,
      options: { type: Array },
      value: { type: String },
    };
  }

  static get styles(): CSSResultArray {
    return [super.styles, styles];
  }

  /** Autocomplete suggestions. */
  options: Option[] | null = null;

  /** Current value as hAPI filter string. */
  value: string | null = null;

  render(): TemplateResult {
    return Group({
      parsedValues: parse(this.value ?? ''),
      options: this.options ?? [],
      t: this.t.bind(this),
      onChange: newValue => {
        this.value = stringify(newValue);
        this.dispatchEvent(new QueryBuilder.ChangeEvent('change'));
      },
    });
  }
}

export { QueryBuilder };
