import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { load } from 'cheerio';

const html = await readFile('contact.html', 'utf8');
const $ = load(html);
const source = await readFile('js/main.js', 'utf8');
const start = source.indexOf('  function bindContactForm() {');
const end = source.indexOf('  function bindTracking()', start);
assert.ok(start >= 0 && end > start, 'Contact binding must exist');
const binding = `${source.slice(start, end)}\nbindContactForm();`;
const plain = value => JSON.parse(JSON.stringify(value));

function contactHarness(sendLead, search = '') {
  const listeners = {};
  const fields = {};
  $('#contactForm input, #contactForm textarea, #contactForm select').each((_, element) => {
    const node = $(element);
    if (node.attr('type') === 'checkbox') return;
    const name = node.attr('name');
    fields[name] = {
      value: node.is('select') ? node.find('option').first().attr('value') || '' : '',
      validity: '',
      listeners: {},
      setCustomValidity(message) { this.validity = message; },
      addEventListener(event, handler) { this.listeners[event] = handler; },
    };
  });
  const services = $('#contactForm input[name="services"]').map((_, element) => ({
    value: $(element).attr('value'), checked: false, defaultChecked: false,
  })).get();
  const status = {
    className: '', content: '', children: [], focusCount: 0,
    set textContent(value) { this.content = value; this.children = []; },
    get textContent() { return this.content + this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); },
    set innerHTML(_) { throw new Error('Status messages must use safe text content'); },
    append(...children) { this.children.push(...children); },
    focus() { this.focusCount++; },
  };
  const button = { innerHTML: 'Send project brief', disabled: false, textContent: '' };
  const form = {
    dataset: {}, elements: fields, attributes: {}, resets: 0,
    querySelectorAll() { return services; },
    addEventListener(event, handler) { listeners[event] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    reportValidity() { return ['name', 'email', 'message'].every(key => !fields[key].validity); },
    reset() { this.resets++; Object.values(fields).forEach(field => { field.value = ''; }); services.forEach(service => { service.checked = service.defaultChecked; }); },
  };
  const nodes = { contactForm: form, formStatus: status, cfSubmit: button };
  const window = { location: { search }, API: { sendLead }, dataLayer: [] };
  vm.runInNewContext(binding, {
    window, URLSearchParams,
    document: { getElementById: id => nodes[id], createElement: () => ({}) },
  });
  const fill = () => {
    const values = { name: '  Contact Test  ', email: ' test@example.com ', company: ' Example Ltd ', message: ' Improve our qualified leads. ', website: ' example.com ', market: ' UK and India ', budget: ' 10,000 ', currency: 'GBP', timeline: 'Within 30 days', timezone: ' London ' };
    for (const [key, value] of Object.entries(values)) fields[key].value = value;
    services.find(service => service.value === 'technical-seo').checked = true;
    services.find(service => service.value === 'conversion').checked = true;
  };
  const submit = () => listeners.submit({ preventDefault() {} });
  return { form, fields, services, status, button, window, fill, submit, listeners };
}

const captured = [];
const saved = contactHarness(async payload => { captured.push(plain(payload)); return { ok: true, data: { stored: true } }; }, '?interest=local-demand');
assert.equal(saved.services.find(service => service.value === 'local-seo').checked, true);
saved.fill();
saved.listeners.focusin();
await saved.submit();
assert.deepEqual(captured[0], {
  name: 'Contact Test', email: 'test@example.com', company: 'Example Ltd', message: 'Improve our qualified leads.',
  services: ['technical-seo', 'local-seo', 'conversion'], website: 'example.com', market: 'UK and India', budget: '10,000',
  currency: 'GBP', timeline: 'Within 30 days', timezone: 'London', source_path: '/contact',
});
assert.equal(saved.form.resets, 1);
assert.equal(saved.status.className, 'form-status is-success');
assert.equal(saved.services.find(service => service.value === 'local-seo').checked, true, 'Reset preserves service link intent');
assert.equal(saved.button.disabled, false);
assert.equal(saved.form.attributes['aria-busy'], undefined);
assert.equal(saved.window.dataLayer.filter(event => event.event === 'portfolio_qualified_lead').length, 1);
saved.listeners.focusin();
assert.equal(saved.window.dataLayer.filter(event => event.event === 'portfolio_form_start').length, 2);

for (const result of [
  { ok: true, data: { stored: false } }, { ok: true, data: {} }, { ok: true, data: null },
  { ok: false, status: 503, data: { error: 'Temporarily unavailable.' } }, null, undefined,
]) {
  const failed = contactHarness(async () => result);
  failed.fill();
  const brief = failed.fields.message.value;
  await failed.submit();
  assert.equal(failed.form.resets, 0, 'Unconfirmed writes preserve the enquiry');
  assert.equal(failed.fields.message.value, brief);
  assert.equal(failed.status.className, 'form-status is-error');
  assert.equal(failed.button.disabled, false);
  assert.equal(failed.window.dataLayer.filter(event => event.event === 'portfolio_qualified_lead').length, 0);
}

const unsafeError = contactHarness(async () => ({ ok: false, status: 400, data: { error: '<img src=x onerror=alert(1)> Invalid enquiry.' } }));
unsafeError.fill();
await unsafeError.submit();
assert.ok(unsafeError.status.textContent.includes('<img src=x onerror=alert(1)> Invalid enquiry.'));
assert.equal(unsafeError.status.children[0].href, 'mailto:fenil.seo@gmail.com');

const timeout = contactHarness(async () => { const error = new Error('Timed out'); error.name = 'AbortError'; throw error; });
timeout.fill();
await timeout.submit();
assert.match(timeout.status.textContent, /could not confirm receipt/);
assert.equal(timeout.form.resets, 0);

let calls = 0;
let finish;
const pending = new Promise(resolve => { finish = resolve; });
const duplicate = contactHarness(async () => { calls++; return pending; });
duplicate.fill();
const first = duplicate.submit();
assert.equal(duplicate.button.disabled, true);
assert.equal(duplicate.form.attributes['aria-busy'], 'true');
await duplicate.submit();
assert.equal(calls, 1, 'Repeated submission while saving sends one request');
finish({ ok: true, data: { stored: true } });
await first;
assert.equal(duplicate.form.resets, 1);

const invalid = contactHarness(async () => { throw new Error('Invalid form must not send'); });
invalid.fill();
invalid.fields.message.value = '   ';
await invalid.submit();
assert.equal(invalid.fields.message.validity, 'Please complete this field.');
assert.equal(invalid.form.resets, 0);
invalid.fields.message.listeners.input();
assert.equal(invalid.fields.message.validity, '');

const apiSource = await readFile('js/api.js', 'utf8');
const requestLog = [];
const deadlines = [];
const apiWindow = {};
const apiContext = {
  window: apiWindow, AbortController,
  setTimeout(callback, ms) { deadlines.push(ms); return 1; }, clearTimeout() {},
  fetch: async (path, options) => { requestLog.push({ path, options }); return { ok: true, status: 201, json: async () => ({ stored: true }) }; },
};
vm.runInNewContext(apiSource, apiContext);
const apiResult = await apiWindow.API.sendLead(captured[0]);
assert.equal(apiResult.data.stored, true);
assert.equal(requestLog[0].path, '/api/leads');
assert.equal(requestLog[0].options.method, 'POST');
assert.deepEqual(JSON.parse(requestLog[0].options.body), captured[0]);
await apiWindow.API.getPosts();
assert.deepEqual(deadlines, [15000, 6000], 'Contact writes allow storage time while reads keep their deadline');
apiContext.fetch = async () => ({ ok: true, status: 201, json: async () => { throw new SyntaxError('Invalid JSON'); } });
assert.equal((await apiWindow.API.sendLead(captured[0])).data, null);
apiContext.fetch = async () => ({ ok: true, status: 201, json: async () => { const error = new Error('Body timed out'); error.name = 'AbortError'; throw error; } });
const abortedBody = await apiWindow.API.sendLead(captured[0]);
assert.equal(abortedBody.ok, false);
assert.equal(abortedBody.status, 0);
assert.equal(abortedBody.error.name, 'AbortError', 'Response body timeout keeps delivery uncertain');
assert.equal($('#cf-message').attr('maxlength'), '2800');
assert.match($('script[src^="/js/main.js"]').attr('src'), /20261010leads/);
assert.match($('script[src^="/js/api.js"]').attr('src'), /20261010leads/);
console.log('Contact flow verified: structured fields, confirmed storage, safe errors, retained input and duplicate-submit guard.');
