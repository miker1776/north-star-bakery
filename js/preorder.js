'use strict';
// Sample prices stay within the ranges on Products. No payment or network submission.
const products = [
  { id: 'loaf', label: 'Signature Loaf', price: 8, leadDays: 2 },
  { id: 'pastry', label: 'Pastry', price: 4, leadDays: 2 },
  { id: 'cake', label: 'Celebration cake', price: 45, leadDays: 7 }
];
const draftFields = ['name', 'email', 'request-type', 'pickup', 'details', 'allergies'];
const storageKeys = { estimate: 'northStar.estimate.v1', draft: 'northStar.draft.v1' };
const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
let storageAvailable = true;
function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; } // A damaged or outdated entry must not break the form.
}
function store(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { storageAvailable = false; return false; }
}
function selectedProduct() { return products.find(item => item.id === $('product').value); }
function updateEstimate(save = true) {
  const item = selectedProduct();
  const quantity = Number($('quantity').value);
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 50;
  $('quantity').setAttribute('aria-invalid', String(!valid));
  $('quantity-error').textContent = valid ? '' : 'Enter a whole quantity from 1 to 50.';
  $('estimate-result').textContent = valid
    ? `${quantity} × ${item.label} at ${money.format(item.price)} each = ${money.format(item.price * quantity)} estimated. Allow at least ${item.leadDays} days.`
    : 'Choose a valid quantity to see your estimate.';
  if (save && valid) {
    const saved = store(storageKeys.estimate, { product: item.id, quantity });
    $('estimate-storage').textContent = saved ? 'Estimate selections saved on this device.' : 'Storage is unavailable. You can still use the estimate.';
  }
}
function fieldError(id, message) {
  $(id).setAttribute('aria-invalid', String(Boolean(message)));
  $(id + '-error').textContent = message;
}
function validateRequest() {
  const errors = {};
  const name = $('name').value.trim();
  if (name.length < 2 || name.length > 80) errors.name = 'Enter a name with 2 to 80 characters.';
  const email = $('email').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.email = 'Enter a valid email address, such as name@example.com.';
  const type = $('request-type').value;
  if (!['preorder', 'question'].includes(type)) errors['request-type'] = 'Choose a request type.';
  const details = $('details').value.trim();
  if (details.length < 10 || details.length > 1000) errors.details = 'Enter 10 to 1,000 characters describing your request.';
  if ($('allergies').value.length > 500) errors.allergies = 'Keep allergy notes to 500 characters.';
  const rawDate = $('pickup').value;
  if (type === 'preorder' || rawDate) {
    // Parse as local calendar time: UTC date parsing can shift the weekday.
    const date = rawDate ? new Date(rawDate + 'T12:00:00') : null;
    const earliest = new Date(); earliest.setHours(12, 0, 0, 0);
    earliest.setDate(earliest.getDate() + (type === 'preorder' ? selectedProduct().leadDays : 0));
    if (!date || Number.isNaN(date.getTime())) errors.pickup = 'Choose a pickup date for your preorder.';
    else if ([0, 1].includes(date.getDay())) errors.pickup = 'Choose Tuesday through Saturday; the bakery is closed Sunday and Monday.';
    else if (date < earliest) errors.pickup = type === 'preorder' ? `Allow at least ${selectedProduct().leadDays} days for this item.` : 'Choose today or a future date.';
  }
  draftFields.forEach(id => fieldError(id, errors[id] || ''));
  return errors;
}
function saveDraft() {
  if (!$('remember-draft').checked) return;
  const draft = Object.fromEntries(draftFields.map(id => [id, $(id).value]));
  $('draft-status').textContent = store(storageKeys.draft, draft) ? 'Request draft saved on this device.' : 'Draft could not be saved. Your entries are still available here.';
}
function restoreData() {
  const estimate = readStored(storageKeys.estimate);
  if (estimate && products.some(p => p.id === estimate.product) && Number.isInteger(estimate.quantity) && estimate.quantity >= 1 && estimate.quantity <= 50) {
    $('product').value = estimate.product; $('quantity').value = estimate.quantity;
    $('estimate-storage').textContent = 'Saved estimate restored on this device.';
  }
  const draft = readStored(storageKeys.draft);
  if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
    draftFields.forEach(id => { if (typeof draft[id] === 'string') $(id).value = draft[id].slice(0, $(id).maxLength > 0 ? $(id).maxLength : 1000); });
    $('remember-draft').checked = true;
    $('draft-status').textContent = 'Saved request draft restored on this device.';
  }
  updateEstimate(false);
}
products.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = `${item.label} — ${money.format(item.price)} each`; $('product').append(option); });
const form = $('request-form');
form.noValidate = true; // JavaScript supplies adjacent, accessible field feedback.
draftFields.forEach(id => {
  const error = document.createElement('span'); error.id = id + '-error'; error.className = 'field-error'; error.setAttribute('aria-live', 'polite');
  $(id).insertAdjacentElement('afterend', error);
  $(id).setAttribute('aria-describedby', [$(id).getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
});
['product', 'quantity'].forEach(id => $(id).addEventListener('input', () => { updateEstimate(); $('form-status').textContent = ''; }));
form.addEventListener('input', event => {
  if (draftFields.includes(event.target.id)) { fieldError(event.target.id, ''); $('form-status').textContent = ''; saveDraft(); }
});
$('remember-draft').addEventListener('change', () => {
  if ($('remember-draft').checked) saveDraft();
  else $('draft-status').textContent = store(storageKeys.draft, null) ? 'Saved draft removed. Current entries remain in the form.' : 'Storage is unavailable; saved draft could not be removed.';
});
$('clear-draft').addEventListener('click', () => {
  const removed = store(storageKeys.draft, null); $('remember-draft').checked = false;
  $('draft-status').textContent = removed ? 'Saved draft cleared. Current entries remain in the form.' : 'Storage is unavailable; saved draft could not be removed.';
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const errors = validateRequest();
  if (Object.keys(errors).length) {
    $('form-status').textContent = 'Please correct the marked fields. Your request has not been sent.';
    $(Object.keys(errors)[0]).focus();
  } else {
    saveDraft();
    $('form-status').textContent = 'Your request passes the form checks. This class project does not send requests or confirm orders.';
  }
});
restoreData();
