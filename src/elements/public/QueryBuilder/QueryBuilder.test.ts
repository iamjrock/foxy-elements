import { LitElement, html } from 'lit-element';
import { expect, fixture, oneEvent } from '@open-wc/testing';

import { QueryBuilder } from './index';

describe('QueryBuilder', () => {
  it('extends LitElement', () => {
    expect(new QueryBuilder()).to.be.instanceOf(LitElement);
  });

  it('registers as foxy-query-builder', () => {
    expect(customElements.get('foxy-query-builder')).to.equal(QueryBuilder);
  });

  it('has a default i18next namespace of "query-builder"', () => {
    expect(new QueryBuilder()).to.have.property('ns', 'query-builder');
  });

  it('exposes change event class as a static field', () => {
    expect(QueryBuilder).to.have.property('ChangeEvent');
    expect(new QueryBuilder.ChangeEvent('change')).to.be.instanceOf(Event);
  });

  it('exposes hAPI operators through a static field', () => {
    expect(QueryBuilder).to.have.property('Operator');

    const Operator = QueryBuilder.Operator;

    expect(Operator).to.have.property('LessThanOrEqual', 'lessthanorequal');
    expect(Operator).to.have.property('GreaterThanOrEqual', 'greaterthanorequal');
    expect(Operator).to.have.property('LessThan', 'lessthan');
    expect(Operator).to.have.property('GreaterThan', 'greaterthan');
    expect(Operator).to.have.property('IsDefined', 'isdefined');
    expect(Operator).to.have.property('Not', 'not');
    expect(Operator).to.have.property('In', 'in');
  });

  it('exposes option types through a static field', () => {
    expect(QueryBuilder).to.have.property('Type');

    const Type = QueryBuilder.Type;

    expect(Type).to.have.property('Attribute', 'attribute');
    expect(Type).to.have.property('Boolean', 'boolean');
    expect(Type).to.have.property('String', 'string');
    expect(Type).to.have.property('Number', 'number');
    expect(Type).to.have.property('Date', 'date');
    expect(Type).to.have.property('Any', 'any');
  });

  it('has a default value of null', () => {
    expect(new QueryBuilder()).to.have.property('value', null);
  });

  it('has default options set to null', () => {
    expect(new QueryBuilder()).to.have.property('options', null);
  });

  it('renders a single empty rule by default', async () => {
    const element = await fixture<QueryBuilder>(html`<foxy-query-builder></foxy-query-builder>`);
    const groups = element.renderRoot.querySelectorAll(`[aria-label="query_builder_group"]`);
    const rules = groups[0]?.querySelectorAll(`[aria-label="query_builder_rule"]`);
    const type = rules?.[0]?.querySelector('[title="type_any"]');
    const path = rules?.[0]?.querySelector('input');

    expect(groups).to.have.length(1);
    expect(rules).to.have.length(1);
    expect(type).to.exist;
    expect(path).to.exist;
    expect(path).to.have.value('');
  });

  it('adds a rule once user starts typing into the path field', async () => {
    const element = await fixture<QueryBuilder>(html`<foxy-query-builder></foxy-query-builder>`);
    const root = element.renderRoot;

    expect(root.querySelectorAll(`[aria-label="query_builder_rule"]`)).to.have.length(1);

    const path = root.querySelector('[aria-label="query_builder_rule"] input') as HTMLInputElement;
    path.value = 'a';
    path.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(root.querySelectorAll(`[aria-label="query_builder_rule"]`)).to.have.length(2);
    expect(element).to.have.value('a=');
  });

  it('clears path of the last rule after adding a new one', async () => {
    const element = await fixture<QueryBuilder>(html`<foxy-query-builder></foxy-query-builder>`);
    const root = element.renderRoot;
    const path = root.querySelector('[aria-label="query_builder_rule"] input') as HTMLInputElement;

    path.value = 'a';
    path.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(
      root.querySelector('[aria-label="query_builder_rule"]:last-of-type input')
    ).to.have.value('');
  });

  it('updates element value with notification once rule field changes', async () => {
    const layout = html`<foxy-query-builder value="foo="></foxy-query-builder>`;
    const element = await fixture<QueryBuilder>(layout);
    const value = element.renderRoot.querySelector('input') as HTMLInputElement;
    const whenGotEvent = oneEvent(element, 'change');

    value.value = 'bar';
    value.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('bar=');
    expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
  });

  it('updates element value with notification once rule type changes', async () => {
    const layout = html`<foxy-query-builder value="foo="></foxy-query-builder>`;
    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;
    const whenGotEvent = oneEvent(element, 'change');

    toggle.click();
    await element.updateComplete;

    expect(element).to.have.value('foo%3Alessthanorequal=');
    expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
  });

  it('updates element value with notification once rule value changes', async () => {
    const layout = html`<foxy-query-builder value="foo=bar"></foxy-query-builder>`;
    const element = await fixture<QueryBuilder>(layout);
    const value = element.renderRoot.querySelectorAll('input')[1] as HTMLInputElement;
    const whenGotEvent = oneEvent(element, 'change');

    value.value = 'baz';
    value.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo=baz');
    expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
  });

  it('cycles through operators when clicking the toggle button', async () => {
    const layout = html`<foxy-query-builder value="foo="></foxy-query-builder>`;
    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    const values = [
      'foo%3Alessthanorequal=',
      'foo%3Alessthan=',
      'foo%3Agreaterthanorequal=',
      'foo%3Agreaterthan=',
      'foo%3Anot=',
      'foo%3Ain=',
      'foo=',
    ];

    for (const value of values) {
      const whenGotEvent = oneEvent(element, 'change');
      toggle.click();
      await element.updateComplete;

      expect(element).to.have.value(value);
      expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
    }
  });

  it('adds attribute-only operators to the cycle for attribute-like resources', async () => {
    const layout = html`<foxy-query-builder value="foo[bar]="></foxy-query-builder>`;
    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    const values = [
      'foo%5Bbar%5D%3Alessthanorequal=',
      'foo%5Bbar%5D%3Alessthan=',
      'foo%5Bbar%5D%3Agreaterthanorequal=',
      'foo%5Bbar%5D%3Agreaterthan=',
      'foo%5Bbar%5D%3Aisdefined=',
      'foo%5Bbar%5D%3Anot=',
      'foo%5Bbar%5D%3Ain=',
      'foo%5Bbar%5D=',
    ];

    for (const value of values) {
      const whenGotEvent = oneEvent(element, 'change');
      toggle.click();
      await element.updateComplete;

      expect(element).to.have.value(value);
      expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
    }
  });

  it('cycles through only applicable operators for known attribute resources', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'attribute', label: 'Foo' }])}
        value="foo[bar]="
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    const values = [
      'foo%5Bbar%5D%3Ain=',
      'foo%5Bbar%5D%3Anot=',
      'foo%5Bbar%5D%3Aisdefined=',
      'foo%5Bbar%5D=',
    ];

    for (const value of values) {
      const whenGotEvent = oneEvent(element, 'change');
      toggle.click();
      await element.updateComplete;

      expect(element).to.have.value(value);
      expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
    }
  });

  it('cycles through only applicable operators for known string fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'string', label: 'Foo' }])}
        value="foo="
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    const values = ['foo%3Ain=', 'foo%3Anot=', 'foo='];

    for (const value of values) {
      const whenGotEvent = oneEvent(element, 'change');
      toggle.click();
      await element.updateComplete;

      expect(element).to.have.value(value);
      expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
    }
  });

  it('cycles through only applicable operators for known number fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'number', label: 'Foo' }])}
        value="foo="
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    const values = [
      'foo%3Ain=',
      'foo%3Anot=',
      'foo%3Agreaterthan=',
      'foo%3Alessthan=',
      'foo%3Agreaterthanorequal=',
      'foo%3Alessthanorequal=',
      'foo=',
    ];

    for (const value of values) {
      const whenGotEvent = oneEvent(element, 'change');
      toggle.click();
      await element.updateComplete;

      expect(element).to.have.value(value);
      expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
    }
  });

  it('cycles through only applicable operators for known date fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'date', label: 'Foo' }])}
        value="foo="
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    const values = ['foo%3Ain=', 'foo%3Anot=', 'foo='];

    for (const value of values) {
      const whenGotEvent = oneEvent(element, 'change');
      toggle.click();
      await element.updateComplete;

      expect(element).to.have.value(value);
      expect(await whenGotEvent).to.be.instanceOf(QueryBuilder.ChangeEvent);
    }
  });

  it('disables operator toggle for known boolean fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'boolean', label: 'Foo' }])}
        value="foo="
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const toggle = root.querySelector('button[title="operator_equal"]') as HTMLButtonElement;

    expect(toggle).to.have.attribute('disabled');
  });

  it('renders datalist options for known field paths', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          { path: 'foo', type: 'boolean', label: 'Foo' },
          { path: 'bar', type: 'string', label: 'Bar' },
        ])}
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;

    const path = root.querySelector('input') as HTMLInputElement;
    const datalist = path.list as HTMLDataListElement;

    expect(datalist).to.exist;
    expect(datalist.options).to.have.length(2);

    expect(datalist.options[0]).to.have.attribute('value', 'foo');
    expect(datalist.options[1]).to.have.attribute('value', 'bar');

    expect(datalist.options[0]).to.have.text('Foo');
    expect(datalist.options[1]).to.have.text('Bar');
  });

  it('supports ranges for known date fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'date', label: 'Foo' }])}
        value="foo=2020-01-01T00%3A00%3A00.000Z..2021-01-01T00%3A00%3A00.000Z"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const [from, to] = [...root.querySelectorAll<HTMLInputElement>('input[type="date"]')];

    expect(from).to.have.property('value', '2020-01-01');
    expect(to).to.have.property('value', '2021-01-01');

    from.value = '2022-01-01';
    from.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo=2022-01-01T00%3A00%3A00.000Z..2021-01-01T00%3A00%3A00.000Z');

    to.value = '2024-01-01';
    to.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo=2022-01-01T00%3A00%3A00.000Z..2024-01-01T00%3A00%3A00.000Z');
  });

  it('supports ranges for known number fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'number', label: 'Foo' }])}
        value="foo=10..20"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const [from, to] = [...root.querySelectorAll<HTMLInputElement>('input[type="number"]')];

    expect(from).to.have.property('value', '10');
    expect(to).to.have.property('value', '20');

    from.value = '30';
    from.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo=30..20');

    to.value = '40';
    to.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo=30..40');
  });

  it('supports lists for known date fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'date', label: 'Foo' }])}
        value="foo%3Ain=2020-01-01T00%3A00%3A00.000Z%2C2021-01-01T00%3A00%3A00.000Z"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const [first, second, addNew] = [
      ...root.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    ];

    expect(first).to.have.property('value', '2020-01-01');
    expect(second).to.have.property('value', '2021-01-01');

    first.value = '2022-01-01';
    first.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value(
      'foo%3Ain=2022-01-01T00%3A00%3A00.000Z%2C2021-01-01T00%3A00%3A00.000Z'
    );

    second.value = '2024-01-01';
    second.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value(
      'foo%3Ain=2022-01-01T00%3A00%3A00.000Z%2C2024-01-01T00%3A00%3A00.000Z'
    );

    addNew.value = '2026-01-01';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value(
      'foo%3Ain=2022-01-01T00%3A00%3A00.000Z%2C2024-01-01T00%3A00%3A00.000Z%2C2026-01-01T00%3A00%3A00.000Z'
    );

    addNew.value = '';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value(
      'foo%3Ain=2022-01-01T00%3A00%3A00.000Z%2C2024-01-01T00%3A00%3A00.000Z'
    );
  });

  it('supports lists for known number fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'number', label: 'Foo' }])}
        value="foo%3Ain=2020%2C2021"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const [first, second, addNew] = [
      ...root.querySelectorAll<HTMLInputElement>('input[type="number"]'),
    ];

    expect(first).to.have.property('value', '2020');
    expect(second).to.have.property('value', '2021');

    first.value = '2022';
    first.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=2022%2C2021');

    second.value = '2024';
    second.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=2022%2C2024');

    addNew.value = '2026';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=2022%2C2024%2C2026');

    addNew.value = '';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=2022%2C2024');
  });

  it('supports lists for known string fields', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([{ path: 'foo', type: 'string', label: 'Foo' }])}
        value="foo%3Ain=bar%2Cbaz"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [path, first, second, addNew] = [...root.querySelectorAll<HTMLInputElement>('input')];

    expect(first).to.have.property('value', 'bar');
    expect(second).to.have.property('value', 'baz');

    first.value = 'qux';
    first.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cbaz');

    second.value = 'abc';
    second.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cabc');

    addNew.value = 'def';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cabc%2Cdef');

    addNew.value = '';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cabc');
  });

  it('supports lists for unknown fields', async () => {
    const layout = html`<foxy-query-builder value="foo%3Ain=bar%2Cbaz"></foxy-query-builder>`;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [path, first, second, addNew] = [...root.querySelectorAll<HTMLInputElement>('input')];

    expect(first).to.have.property('value', 'bar');
    expect(second).to.have.property('value', 'baz');

    first.value = 'qux';
    first.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cbaz');

    second.value = 'abc';
    second.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cabc');

    addNew.value = 'def';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cabc%2Cdef');

    addNew.value = '';
    addNew.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    expect(element).to.have.value('foo%3Ain=qux%2Cabc');
  });

  it('supports predefined options for single string field values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'string',
            list: [
              { value: 'bar', label: 'BAR' },
              { value: 'baz', label: 'BAZ' },
            ],
          },
        ])}
        value="foo=bar"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const value = root.querySelector('select') as HTMLSelectElement;

    expect(value).to.exist;
    expect(value.options).to.have.length(2);

    expect(value.options[0]).to.have.value('bar');
    expect(value.options[0]).to.contain.text('BAR');
    expect(value.options[0]).to.have.attribute('selected');

    expect(value.options[1]).to.have.value('baz');
    expect(value.options[1]).to.contain.text('BAZ');
    expect(value.options[1]).to.not.have.attribute('selected');
  });

  it('supports predefined options for single attribute values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'attribute',
            list: [
              { value: 'bar', label: 'BAR' },
              { value: 'baz', label: 'BAZ' },
            ],
          },
        ])}
        value="foo[abc]=bar"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const value = root.querySelector('select') as HTMLSelectElement;

    expect(value).to.exist;
    expect(value.options).to.have.length(2);

    expect(value.options[0]).to.have.value('bar');
    expect(value.options[0]).to.contain.text('BAR');
    expect(value.options[0]).to.have.attribute('selected');

    expect(value.options[1]).to.have.value('baz');
    expect(value.options[1]).to.contain.text('BAZ');
    expect(value.options[1]).to.not.have.attribute('selected');
  });

  it('supports predefined options for single number field values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'number',
            list: [
              { value: '123', label: 'One Two Three' },
              { value: '456', label: 'Four Five Six' },
            ],
          },
        ])}
        value="foo=123"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const value = root.querySelector('select') as HTMLSelectElement;

    expect(value).to.exist;
    expect(value.options).to.have.length(2);

    expect(value.options[0]).to.have.value('123');
    expect(value.options[0]).to.contain.text('One Two Three');
    expect(value.options[0]).to.have.attribute('selected');

    expect(value.options[1]).to.have.value('456');
    expect(value.options[1]).to.contain.text('Four Five Six');
    expect(value.options[1]).to.not.have.attribute('selected');
  });

  it('supports predefined options for single boolean field values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'boolean',
            list: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          },
        ])}
        value="foo=true"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const value = root.querySelector('select') as HTMLSelectElement;

    expect(value).to.exist;
    expect(value.options).to.have.length(2);

    expect(value.options[0]).to.have.value('true');
    expect(value.options[0]).to.contain.text('Yes');
    expect(value.options[0]).to.have.attribute('selected');

    expect(value.options[1]).to.have.value('false');
    expect(value.options[1]).to.contain.text('No');
    expect(value.options[1]).to.not.have.attribute('selected');
  });

  it('supports predefined options for single date field values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'date',
            list: [
              { value: '2020-01-01', label: 'January 1, 2020' },
              { value: '2021-01-01', label: 'January 1, 2021' },
            ],
          },
        ])}
        value="foo=2020-01-01"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const value = root.querySelector('select') as HTMLSelectElement;

    expect(value).to.exist;
    expect(value.options).to.have.length(2);

    expect(value.options[0]).to.have.value('2020-01-01');
    expect(value.options[0]).to.contain.text('January 1, 2020');
    expect(value.options[0]).to.have.attribute('selected');

    expect(value.options[1]).to.have.value('2021-01-01');
    expect(value.options[1]).to.contain.text('January 1, 2021');
    expect(value.options[1]).to.not.have.attribute('selected');
  });

  it('supports predefined options for string list values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'string',
            list: [
              { value: 'bar', label: 'BAR' },
              { value: 'baz', label: 'BAZ' },
            ],
          },
        ])}
        value="foo%3Ain=bar%2Cbaz"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const values = root.querySelectorAll<HTMLSelectElement>('select');

    for (const value of values) {
      const options = [...value.options].reverse();

      expect(options[0]).to.have.value('baz');
      expect(options[0]).to.contain.text('BAZ');

      expect(options[1]).to.have.value('bar');
      expect(options[1]).to.contain.text('BAR');
    }
  });

  it('supports predefined options for number list values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'number',
            list: [
              { value: '123', label: 'One Two Three' },
              { value: '456', label: 'Four Five Six' },
            ],
          },
        ])}
        value="foo%3Ain=123%2C456"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const values = root.querySelectorAll<HTMLSelectElement>('select');

    for (const value of values) {
      const options = [...value.options].reverse();

      expect(options[0]).to.have.value('456');
      expect(options[0]).to.contain.text('Four Five Six');

      expect(options[1]).to.have.value('123');
      expect(options[1]).to.contain.text('One Two Three');
    }
  });

  it('supports predefined options for date list values', async () => {
    const layout = html`
      <foxy-query-builder
        options=${JSON.stringify([
          {
            label: 'Foo',
            path: 'foo',
            type: 'date',
            list: [
              { value: '2020-01-01T00:00:00.000Z', label: 'January 1, 2020' },
              { value: '2021-01-01T00:00:00.000Z', label: 'January 1, 2021' },
            ],
          },
        ])}
        value="foo%3Ain=2020-01-01T00%3A00%3A00.000Z%2C2021-01-01T00%3A00%3A00.000Z"
      >
      </foxy-query-builder>
    `;

    const element = await fixture<QueryBuilder>(layout);
    const root = element.renderRoot;
    const values = root.querySelectorAll<HTMLSelectElement>('select');

    for (const value of values) {
      const options = [...value.options].reverse();

      expect(options[0]).to.have.value('2021-01-01T00:00:00.000Z');
      expect(options[0]).to.contain.text('January 1, 2021');

      expect(options[1]).to.have.value('2020-01-01T00:00:00.000Z');
      expect(options[1]).to.contain.text('January 1, 2020');
    }
  });
});
