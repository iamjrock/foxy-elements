import { html, property } from 'lit-element';
import { cache } from 'lit-html/directives/cache';
import { Translatable } from '../../../../../mixins/translatable';
import { concatTruthy } from '../../../../../utils/concat-truthy';
import { parseDuration } from '../../../../../utils/parse-duration';
import { prevent } from '../../../../../utils/prevent';
import { translateWeekday } from '../../../../../utils/translate-weekday';
import { Group, Warning, I18N } from '../../../../private/index';
import { AllowedDays } from '../AllowedDays/AllowedDays';
import { AllowedDaysChangeEvent } from '../AllowedDays/AllowedDaysChangeEvent';
import { DisallowedDates } from '../DisallowedDates/DisallowedDates';
import { DisallowedDatesChangeEvent } from '../DisallowedDates/DisallowedDatesChangeEvent';
import { JSONataInput } from '../JSONataInput/JSONataInput';
import { JSONataInputChangeEvent } from '../JSONataInput/JSONataInputChangeEvent';
import { OffsetInput } from '../OffsetInput/OffsetInput';
import { OffsetInputChangeEvent } from '../OffsetInput/OffsetInputChangeEvent';
import { NextDateModificationRuleChangeEvent } from './NextDateModificationRuleChangeEvent';
import { NextDateModificationRuleRemoveEvent } from './NextDateModificationRuleRemoveEvent';
import { Rule } from './Rule';

export class NextDateModificationRule extends Translatable {
  public static get scopedElements() {
    return {
      'x-disallowed-dates': DisallowedDates,
      'x-jsonata-input': JSONataInput,
      'x-offset-input': OffsetInput,
      'x-allowed-days': AllowedDays,
      'iron-icon': customElements.get('iron-icon'),
      'x-warning': Warning,
      'x-group': Group,
      'x-i18n': I18N,
    };
  }

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Object })
  public value: Rule = { jsonataQuery: '*' };

  @property({ type: Boolean })
  public open = false;

  public constructor() {
    super('customer-portal-settings');
  }

  public render() {
    const { min, max, allowedDays, jsonataQuery, disallowedDates } = this.value;
    const hasOffset = min || max;
    const hasAllowed = allowedDays && allowedDays.days.length > 0;
    const hasDisallowed = disallowedDates && disallowedDates.length > 0;

    return html`
      <x-group frame>
        <details
          data-testid="details"
          class="font-lumo"
          ?open=${this.open}
          @toggle=${() => (this.open = !this.open)}
        >
          <summary class="relative leading-s">
            <div class="p-m text-m text-header font-medium space-y-s">
              <div>
                <x-i18n
                  .ns=${this.ns}
                  .lang=${this.lang}
                  key=${`ndmod.${jsonataQuery === '*' ? 'all' : 'some'}Title`}
                >
                  ${jsonataQuery !== '*' ? this.__renderJSONataSummary(jsonataQuery) : ''}
                </x-i18n>
              </div>

              ${cache(
                !this.open && (hasOffset || hasAllowed || hasDisallowed)
                  ? html`
                      <div>
                        ${concatTruthy(
                          hasOffset && this.__renderMinMaxSummary(min, max),
                          hasAllowed && this.__renderAllowedSummary(allowedDays!),
                          hasDisallowed && this.__renderDisallowedSummary(disallowedDates!)
                        )}
                      </div>
                    `
                  : ''
              )}
            </div>

            <button
              data-testid="remove"
              .disabled=${this.disabled}
              class="flex items-center justify-center absolute top-0 right-0 text-tertiary hover:text-secondary disabled:text-tertiary disabled:opacity-50 disabled:cursor-default"
              style="width: 54px; height: 54px"
              @click=${prevent(() => this.dispatchEvent(new NextDateModificationRuleRemoveEvent()))}
            >
              <iron-icon icon="lumo:cross"></iron-icon>
            </button>
          </summary>

          <article class="space-y-m">
            <x-group>
              <x-i18n slot="header" .ns=${this.ns} .lang=${this.lang} key="ndmod.match"> </x-i18n>

              <x-jsonata-input
                data-testid="jsonata"
                .lang=${this.lang}
                .value=${jsonataQuery}
                .disabled=${this.disabled}
                @change=${(evt: JSONataInputChangeEvent) => {
                  this.value = { ...this.value, jsonataQuery: evt.detail };
                  this.__sendUpdate();
                }}
              >
              </x-jsonata-input>
            </x-group>

            <div class="flex space-y-m md:space-y-0 flex-col md:flex-row">
              <div class="md:w-1/2 md:border-r md:border-shade-10">
                <x-offset-input
                  data-testid="min"
                  type="min"
                  .lang=${this.lang}
                  .value=${min}
                  .disabled=${this.disabled}
                  @change=${(evt: OffsetInputChangeEvent) => {
                    this.value = { ...this.value, min: evt.detail };
                    this.__sendUpdate();
                  }}
                >
                </x-offset-input>
              </div>

              <div class="md:w-1/2">
                <x-offset-input
                  data-testid="max"
                  type="max"
                  .lang=${this.lang}
                  .value=${max}
                  .disabled=${this.disabled}
                  @change=${(evt: OffsetInputChangeEvent) => {
                    this.value = { ...this.value, max: evt.detail };
                    this.__sendUpdate();
                  }}
                >
                </x-offset-input>
              </div>
            </div>

            ${this.__compareDurations(min, max) === -1
              ? html`
                  <x-warning class="mx-m" data-testid="warning">
                    <x-i18n .ns=${this.ns} .lang=${this.lang} key="ndmod.minWarning"> </x-i18n>
                  </x-warning>
                `
              : ''}

            <x-group>
              <x-i18n slot="header" .ns=${this.ns} .lang=${this.lang} key="ndmod.allowed"> </x-i18n>

              <x-allowed-days
                data-testid="allowed"
                .lang=${this.lang}
                .value=${allowedDays}
                .disabled=${this.disabled}
                @change=${(evt: AllowedDaysChangeEvent) => {
                  this.value = { ...this.value, allowedDays: evt.detail };
                  this.__sendUpdate();
                }}
              >
              </x-allowed-days>
            </x-group>

            <x-group>
              <x-i18n slot="header" .ns=${this.ns} .lang=${this.lang} key="ndmod.excluded">
              </x-i18n>

              <x-disallowed-dates
                data-testid="disallowed"
                .lang=${this.lang}
                .value=${disallowedDates ?? []}
                .disabled=${this.disabled}
                @change=${(evt: DisallowedDatesChangeEvent) => {
                  this.value = { ...this.value, disallowedDates: evt.detail };
                  this.__sendUpdate();
                }}
              >
              </x-disallowed-dates>
            </x-group>
          </article>
        </details>
      </x-group>
    `;
  }

  private __sendUpdate() {
    this.dispatchEvent(new NextDateModificationRuleChangeEvent(this.value));
  }

  private __getEstimatedDaysFrom(duration: string) {
    const { count, units } = parseDuration(duration);

    if (units === 'y') return count * 365;
    if (units === 'm') return count * 31;
    if (units === 'w') return count * 7;

    return count;
  }

  private __compareDurations(a: string | undefined, b: string | undefined) {
    if (a === b) return 0;
    if (!a || !b) return 1;
    if (this.__getEstimatedDaysFrom(a) < this.__getEstimatedDaysFrom(b)) return 1;
    return -1;
  }

  private __renderJSONataSummary(content: string) {
    return html`
      <code class="inline-block rounded bg-success-10 text-success px-xs text-xs leading-s">
        ${content}
      </code>
    `;
  }

  private __renderMinMaxContent(result?: ReturnType<typeof parseDuration>) {
    if (result) {
      const { count, units } = result;
      return html`
        ${count}
        <x-i18n .ns=${this.ns} .lang=${this.lang} key=${units} .opts=${{ count }}></x-i18n>
      `;
    } else {
      return html`<x-i18n .ns=${this.ns} .lang=${this.lang} key="ndmod.any"></x-i18n>`;
    }
  }

  private __renderMinMaxSummary(min?: string, max?: string) {
    return html`
      <div class="text-s text-tertiary font-normal">
        <x-i18n .ns=${this.ns} .lang=${this.lang} key="ndmod.any">
          <span>:</span>
          <span class="text-secondary">
            ${this.__renderMinMaxContent(min ? parseDuration(min) : undefined)} &mdash;
            ${this.__renderMinMaxContent(max ? parseDuration(max) : undefined)}
          </span>
        </x-i18n>
      </div>
    `;
  }

  private __renderAllowedSummary({ type, days }: Required<Rule>['allowedDays']) {
    return html`
      <div class="text-s text-tertiary font-normal">
        <x-i18n .ns=${this.ns} .lang=${this.lang} key="ndmod.allowed">
          <span>:</span>
          <span class="text-secondary">
            ${type === 'month' ? days.join(', ') : ''}
            ${type === 'day'
              ? days.map(day => translateWeekday(day, this.lang, 'short')).join(', ')
              : ''}
          </span>
        </x-i18n>
      </div>
    `;
  }

  private __renderDisallowedSummary(dates: string[]) {
    return html`
      <div class="text-s text-tertiary font-normal">
        <x-i18n .ns=${this.ns} .lang=${this.lang} key="ndmod.excluded">
          <span>:</span>
          <span class="text-secondary">
            ${dates
              .map(date =>
                new Date(date).toLocaleDateString(this.lang, {
                  year: '2-digit',
                  month: 'short',
                  day: 'numeric',
                })
              )
              .join('; ')}
          </span>
        </x-i18n>
      </div>
    `;
  }
}
