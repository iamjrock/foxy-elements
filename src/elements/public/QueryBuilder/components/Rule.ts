import * as icons from '../icons/index';

import { Operator, Option, ParsedValue, Type } from '../types';
import { TemplateResult, html } from 'lit-html';

import { BooleanValue } from './BooleanValue';
import { I18n } from '../../I18n/I18n';
import { IsDefinedValue } from './IsDefinedValue';
import { ListValue } from './ListValue';
import { Name } from './Name';
import { OperatorToggle } from './OperatorToggle';
import { Path } from './Path';
import { RangeValue } from './RangeValue';
import { SingleValue } from './SingleValue';
import { classMap } from '../../../../utils/class-map';

export type RuleParams = {
  parsedValue: ParsedValue;
  isFullSize?: boolean;
  isNested?: boolean;
  options: Option[];
  t: I18n['t'];
  onChange: (newValue: ParsedValue) => void;
  onDelete?: () => void;
  onConvert?: () => void;
};

export function Rule(params: RuleParams): TemplateResult {
  const { parsedValue, options, t, isNested, isFullSize, onChange, onDelete, onConvert } = params;

  const option = options.find(o => o.path === parsedValue.path) ?? null;
  const type = option?.type ?? Type.Any;
  const operator = parsedValue.operator;
  const componentParams = { parsedValue: parsedValue, option, options, t, onChange };

  const typeToIcon = {
    [Type.Attribute]: icons.typeAttribute,
    [Type.Boolean]: icons.typeBoolean,
    [Type.Number]: icons.typeNumber,
    [Type.String]: icons.typeString,
    [Type.Date]: icons.typeDate,
    [Type.Any]: icons.typeAny,
  };

  return html`
    <div class="flex items-center space-x-s" aria-label=${t('query_builder_rule')}>
      <div
        class=${classMap({
          'flex-1 bg-base rounded overflow-hidden border': true,
          'border-contrast-10': !isNested,
          'border-contrast-50': !!isNested,
        })}
      >
        <div class="bg-contrast-10">
          <div class="grid gap-1px grid-vertical sm-grid-horizontal">
            <div class="bg-base" title=${t(`type_${type}`)}>
              <div class="w-m h-m text-tertiary" aria-hidden="true">
                ${option ? typeToIcon[type] : icons.typeAny}
              </div>
            </div>

            <div class="bg-base">
              ${parsedValue.path && (type === Type.Attribute || parsedValue.name)
                ? html`
                    <div class="bg-contrast-10 grid gap-1px grid-cols-1 sm-grid-cols-2">
                      <div class="bg-base">${Path(componentParams)}</div>
                      <div class="bg-base">${Name(componentParams)}</div>
                    </div>
                  `
                : Path(componentParams)}
            </div>

            <div class="bg-base">${OperatorToggle(componentParams)}</div>

            <div class="bg-base">
              ${operator === Operator.In
                ? ListValue(componentParams)
                : operator === Operator.IsDefined
                ? IsDefinedValue(componentParams)
                : type === Type.Boolean
                ? BooleanValue(componentParams)
                : operator === null && [Type.Number, Type.Date].includes(type)
                ? RangeValue(componentParams)
                : SingleValue(componentParams)}
            </div>
          </div>
        </div>
      </div>

      <div
        class=${classMap({
          '-mr-s self-start flex-col sm-flex-row flex-shrink-0 items-center': true,
          'border-t border-b border-transparent divide-y divide-transparent': true,
          'hidden': !!isFullSize,
          'flex': !isFullSize,
        })}
      >
        <button
          aria-label=${t('delete')}
          class=${classMap({
            'box-content flex w-m h-m rounded-full transition-colors': true,
            'text-secondary hover-bg-contrast-5 hover-text-error': true,
            'focus-outline-none focus-ring-2 ring-primary-50': true,
            'opacity-0': !parsedValue.path,
          })}
          ?disabled=${!parsedValue.path}
          @click=${onDelete}
        >
          <iron-icon
            aria-hidden="true"
            class="m-auto icon-inline text-xl"
            icon="icons:remove-circle-outline"
          >
          </iron-icon>
        </button>

        <button
          aria-label=${t('add_or_clause')}
          class=${classMap({
            'box-content flex w-m h-m rounded-full transition-colors text-success': true,
            'hover-bg-contrast-5 focus-outline-none focus-ring-2 ring-primary-50': true,
            'opacity-0': !parsedValue.path || !!isNested,
          })}
          ?disabled=${!parsedValue.path}
          @click=${onConvert}
        >
          <iron-icon
            aria-hidden="true"
            class="m-auto icon-inline text-xl"
            icon="icons:add-circle-outline"
          >
          </iron-icon>
        </button>
      </div>
    </div>
  `;
}
