/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: axisdirect "Open your account" lead form.
 *
 * The source card is an MUI form: a floating label, a "+91-" adornment, a
 * text input (placeholder "Enter Mobile Number"), a disabled "Get OTP" submit
 * button and a terms checkbox. html2md would keep the label, the adornment and
 * the placeholder as three loose lines and drop the controls, so the form is
 * replaced in beforeTransform with four authorable paragraphs:
 *
 *   <p>Enter Mobile Number</p>                         field label
 *   <p>+91- Enter Mobile Number</p>                    the single input field
 *   <p>Get OTP</p>                                     submit CTA
 *   <p>I have read and accepted all the <em>terms and conditions</em></p>
 *
 * Selectors are content-based (the MUI class names are hashed): the form is
 * the one holding the mobile-number input.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

const clean = (t) => (t || '').replace(/[​\s]+/g, ' ').trim();

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;
  const { document } = payload;

  const input = element.querySelector(
    'form input[name="mobileNumber"], form input#mobileNumber, form input[inputmode="numeric"], form input[placeholder*="Mobile" i]',
  );
  if (!input) return;
  const form = input.closest('form');

  const label = form.querySelector(`label[for="${input.id}"]`) || form.querySelector('label');
  const labelText = clean(label && label.textContent) || clean(input.getAttribute('placeholder'));
  const placeholder = clean(input.getAttribute('placeholder')) || labelText;

  // "+91-" style adornment: a short text node next to the input
  const prefix = [...form.querySelectorAll('span, div, p')]
    .map((e) => clean(e.textContent))
    .find((t) => /^\+\d{1,3}-?$/.test(t)) || '';

  const submit = form.querySelector('button[type="submit"]') || form.querySelector('button');
  const ctaText = clean(submit && submit.textContent);

  // terms line: the text beside the checkbox; its inner button is the link text
  const checkbox = form.querySelector('input[type="checkbox"]');
  let terms = null;
  if (checkbox) {
    let row = checkbox.parentElement;
    while (row && row !== form && !/accept|agree|terms/i.test(row.textContent)) row = row.parentElement;
    const textEl = row && [...row.querySelectorAll('span')].find((s) => /accept|agree/i.test(s.textContent) && !s.contains(checkbox));
    if (textEl) {
      terms = document.createElement('p');
      [...textEl.childNodes].forEach((n) => {
        if (n.nodeType === 1 && /^(button|a)$/i.test(n.tagName)) {
          const em = document.createElement('em');
          em.textContent = clean(n.textContent);
          terms.append(' ', em);
        } else if (n.nodeType === 3 || n.nodeType === 1) {
          terms.append(clean(n.textContent));
        }
      });
      terms.normalize();
    }
  }

  const out = [];
  const p = (text) => { const el = document.createElement('p'); el.textContent = text; out.push(el); };
  if (labelText) p(labelText);
  p(clean(`${prefix} ${placeholder}`));
  if (ctaText) p(ctaText);
  if (terms) out.push(terms);

  form.replaceWith(...out);
}
