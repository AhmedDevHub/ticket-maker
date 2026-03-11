/* ─── Constants ─────────────────────────────────────────────────── */
const EXCLUDED_ACTIVATION = new Set(['no need']);
const EXCLUDED_SHIPPING   = new Set(['not started yet', 'no line item/ no hw to be shipped.', 'no line item.']);
const EXCLUDED_MENU       = new Set(['not started yet', 'not line item', 'not need']);
const EXCLUDED_GENERIC    = new Set(['not started yet', 'not line item']);
const SHIPPING_SLA_TRIGGER = 'Not yet delivered';

/* ─── Helpers ───────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

function setVisible(fieldId, visible) {
  const el = $(fieldId);
  if (!el) return;
  const wrapper = el.closest('label') || el.parentElement;
  wrapper.style.display = visible ? '' : 'none';
  visible ? el.setAttribute('required', '') : el.removeAttribute('required');
}

/* Build all time <select> dropdowns with 15-min slots 00:00 – 24:00 */
function buildTimeSelects() {
  const slots = [''];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }
  slots.push('24:00');

  document.querySelectorAll('select.time-select').forEach(sel => {
    sel.innerHTML = slots.map((t, i) =>
      `<option value="${t}">${i === 0 ? '— Time —' : t}</option>`
    ).join('');
  });
}

function combineDateTime(dateId, timeId) {
  const d = $(dateId)?.value;
  const t = $(timeId)?.value;
  if (!d && !t) return '';
  return `${d || ''} ${t || ''}`.trim();
}

function formatDateTime(raw) {
  if (!raw) return '';
  const [datePart, timePart] = raw.split(' ');
  if (!datePart) return raw;
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}${timePart ? ' ' + timePart : ''}`;
}

/* ─── Log Builder ───────────────────────────────────────────────── */
function buildLogLine(data) {
  const lines = [
    `Customer: ${data.customerName}`,
    `Phone: ${data.customerPhone || '-'}`,
    `Call: ${data.callStatus}`,
  ];

  const push = (label, value) => lines.push(`${label}: ${value}`);

  if (data.activationStatus && !EXCLUDED_ACTIVATION.has(data.activationStatus.toLowerCase()))
    push('Activation', data.activationStatus);

  if (data.shippingStatus && !EXCLUDED_SHIPPING.has(data.shippingStatus.toLowerCase())) {
    const sla = (data.shippingStatus === SHIPPING_SLA_TRIGGER && data.shippingSla)
      ? ` (${data.shippingSla})` : '';
    push('Shipping', data.shippingStatus + sla);
  }

  if (data.menuStatus && !EXCLUDED_MENU.has(data.menuStatus.toLowerCase()))
    push('Menu', data.menuStatus);

  if (data.installationStatus && !EXCLUDED_GENERIC.has(data.installationStatus.toLowerCase())) {
    const dt = (data.installationStatus === 'Scheduled' && data.installationDatetime)
      ? ` (Date & Time: ${formatDateTime(data.installationDatetime)})` : '';
    push('Installation', data.installationStatus + dt);
  }

  if (data.trainingStatus && !EXCLUDED_GENERIC.has(data.trainingStatus.toLowerCase())) {
    const dt = (data.trainingStatus === 'Scheduled' && data.trainingDatetime)
      ? ` (Date & Time: ${formatDateTime(data.trainingDatetime)})` : '';
    push('Training', data.trainingStatus + dt);
  }

  if (data.whatsappTicket)         push('WhatsApp Ticket', data.whatsappTicket);
  if (data.followUpDateTime)       push('Next Follow-up', formatDateTime(data.followUpDateTime));
  if (data.followUpNotes)          push('Follow-up Notes', data.followUpNotes);
  if (data.standaloneNextFollowUp) push('Next Follow-up', formatDateTime(data.standaloneNextFollowUp));
  if (data.freeComment?.trim())    push('Comment', data.freeComment.trim());

  return lines.join('\n');
}

/* ─── Main ───────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {

  const form               = $('ticket-form');
  buildTimeSelects();
  const outputText         = $('output-text');
  const copyBtn            = $('copy-btn');
  const clearBtn           = $('clear-btn');
  const workOrderTypeInput = $('work-order-type');
  const callStatusInput    = $('call-status');
  const shippingInput      = $('shipping-status');
  const installInput       = $('installation-status');
  const trainingInput      = $('training-status');
  const showSections       = [...document.querySelectorAll('input[name="show-sections"]')];

  if (!form || !outputText || !copyBtn) return;

  /* ── Theme ─────────────────────────────────────────────────────── */
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') { html.classList.add('light-mode'); syncThemeIcon(true); }

  $('theme-toggle').addEventListener('click', () => {
    const light = html.classList.toggle('light-mode');
    localStorage.setItem('theme', light ? 'light' : 'dark');
    syncThemeIcon(light);
  });

  function syncThemeIcon(isLight) {
    const icon = $('theme-toggle').querySelector('i');
    icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
  }

  /* ── Visibility helpers ────────────────────────────────────────── */
  const STATUS_FIELD_MAP = {
    activation:   'activation-status',
    shipping:     'shipping-status',
    menu:         'menu-status',
    installation: 'installation-status',
    training:     'training-status',
  };

  /* ADDED: was missing — shows/hides the SLA field under shipping */
  function updateSlaVisibility() {
    const slaField = $('shipping-sla-field');
    if (slaField) {
      slaField.style.display = shippingInput?.value === SHIPPING_SLA_TRIGGER ? '' : 'none';
    }
  }

  function updateInstallDatetime() {
    const field = $('installation-datetime-field');
    if (field) field.style.display = installInput?.value === 'Scheduled' ? 'flex' : 'none';
  }

  function updateTrainingDatetime() {
    const field = $('training-datetime-field');
    if (field) field.style.display = trainingInput?.value === 'Scheduled' ? 'flex' : 'none';
  }

  /* ADDED: was missing — hides all status fields and sub-fields */
  function hideAllStatusFields() {
    Object.values(STATUS_FIELD_MAP).forEach(id => setVisible(id, false));
    const installDt = $('installation-datetime-field');
    if (installDt) installDt.style.display = 'none';
    const trainingDt = $('training-datetime-field');
    if (trainingDt) trainingDt.style.display = 'none';
    const slaField = $('shipping-sla-field');
    if (slaField) slaField.style.display = 'none';
  }

  function showAllStatusFields() {
    Object.values(STATUS_FIELD_MAP).forEach(id => setVisible(id, true));
    const nfu = $('standalone-next-follow-up-date');
    if (nfu) {
      const lbl = nfu.closest('label');
      if (lbl) lbl.style.display = '';
    }
    updateSlaVisibility();
    updateInstallDatetime();
    updateTrainingDatetime();
  }

  function updateCallStatus() {
    const status = callStatusInput.value;
    const isWhatsApp  = status === 'Contacted on WhatsApp';
    const isConnected = status === 'Connected';
    const isDropped   = status === 'Dropped';
    const isCbReq     = status === 'Call back requested';
    const isNotConn   = status === 'Not connected';

    const wtf = $('whatsapp-ticket-field');
    if (wtf) wtf.style.display = isWhatsApp ? '' : 'none';

    const fuf  = $('follow-up-field');
    const funf = $('follow-up-notes-field');
    if (fuf)  fuf.style.display  = isWhatsApp ? '' : 'none';
    if (funf) funf.style.display = isWhatsApp ? '' : 'none';

    if (isConnected || isWhatsApp) {
      updateWorkOrderVisibility();
    } else if (isDropped || isCbReq || isNotConn) {
      hideAllStatusFields();
      const standaloneLabel = $('standalone-next-follow-up-date')?.closest('label');
      if (standaloneLabel) standaloneLabel.style.display = '';
    }
  }

  /* FIXED: follow-up work order now correctly shows only checked sections */
  function updateWorkOrderVisibility() {
    const isNewClient = workOrderTypeInput.value === 'new-client';
    const followUpOptions = $('follow-up-options');
    if (followUpOptions) followUpOptions.style.display = isNewClient ? 'none' : 'block';

    if (isNewClient) {
      showAllStatusFields();
    } else {
      // Show only fields whose checkbox is checked
      Object.entries(STATUS_FIELD_MAP).forEach(([section, fieldId]) => {
        const cb = showSections.find(cb => cb.value === section);
        setVisible(fieldId, cb?.checked ?? false);
      });

      // Shipping sub-field
      const shippingChecked = showSections.find(cb => cb.value === 'shipping')?.checked ?? false;
      const slaField = $('shipping-sla-field');
      if (slaField) slaField.style.display = shippingChecked ? (shippingInput?.value === SHIPPING_SLA_TRIGGER ? '' : 'none') : 'none';

      // Installation sub-field
      const installChecked = showSections.find(cb => cb.value === 'installation')?.checked ?? false;
      const installDt = $('installation-datetime-field');
      if (installDt) installDt.style.display = installChecked && installInput?.value === 'Scheduled' ? 'flex' : 'none';

      // Training sub-field
      const trainingChecked = showSections.find(cb => cb.value === 'training')?.checked ?? false;
      const trainingDt = $('training-datetime-field');
      if (trainingDt) trainingDt.style.display = trainingChecked && trainingInput?.value === 'Scheduled' ? 'flex' : 'none';
    }
  }

  /* ── Event listeners ───────────────────────────────────────────── */
  shippingInput?.addEventListener('change', updateSlaVisibility);
  installInput?.addEventListener('change', updateInstallDatetime);
  trainingInput?.addEventListener('change', updateTrainingDatetime);
  callStatusInput?.addEventListener('change', updateCallStatus);
  workOrderTypeInput.addEventListener('change', updateWorkOrderVisibility);
  showSections.forEach(cb => cb.addEventListener('change', updateWorkOrderVisibility));

  updateWorkOrderVisibility();
  updateCallStatus();

  /* ── Form submission ───────────────────────────────────────────── */
  form.addEventListener('submit', e => {
    e.preventDefault();

    const name  = $('customer-name').value.trim();
    const phone = $('customer-phone').value.trim();
    const call  = $('call-status').value;

    if (!name)  { alert('Please enter a customer name.'); return; }
    if (!call)  { alert('Please select a call status.'); return; }
    if (phone && !/^\d+$/.test(phone)) {
      alert('Phone must contain numbers only (no spaces or symbols).'); return;
    }

    const data = { customerName: name, customerPhone: phone, callStatus: call };

    Object.values(STATUS_FIELD_MAP).forEach(fieldId => {
      const el = $(fieldId);
      if (!el) return;
      const wrapper = el.closest('label') || el.parentElement;
      if (wrapper.style.display === 'none') return;
      const key = fieldId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      data[key] = el.value;

      if (fieldId === 'shipping-status' && el.value === SHIPPING_SLA_TRIGGER)
        data.shippingSla = $('shipping-sla')?.value;
      if (fieldId === 'installation-status' && el.value === 'Scheduled')
        data.installationDatetime = combineDateTime('installation-date', 'installation-time');
      if (fieldId === 'training-status' && el.value === 'Scheduled')
        data.trainingDatetime = combineDateTime('training-date', 'training-time');
    });

    const wtField = $('whatsapp-ticket-field');
    if (wtField?.style.display !== 'none')
      data.whatsappTicket = $('whatsapp-ticket')?.value.trim();

    const fufField = $('follow-up-field');
    if (fufField?.style.display !== 'none')
      data.followUpDateTime = combineDateTime('follow-up-date', 'follow-up-time');

    const funfField = $('follow-up-notes-field');
    if (funfField?.style.display !== 'none')
      data.followUpNotes = $('follow-up-notes')?.value.trim();

    data.standaloneNextFollowUp = combineDateTime('standalone-next-follow-up-date', 'standalone-next-follow-up-time');
    data.freeComment = $('free-comment')?.value || '';

    if (data.shippingStatus === SHIPPING_SLA_TRIGGER && !data.shippingSla) {
      alert('Please select a shipping SLA for "Not yet delivered".'); return;
    }

    outputText.value = buildLogLine(data);
    copyBtn.disabled = false;

    form.reset();
    showSections.forEach(cb => cb.checked = false);
    updateWorkOrderVisibility();
    updateCallStatus();
    updateSlaVisibility();
    updateInstallDatetime();
    updateTrainingDatetime();
  });

  /* ── Clear ─────────────────────────────────────────────────────── */
  clearBtn?.addEventListener('click', () => {
    if (outputText.value.trim() && !confirm('Clear all log entries? This cannot be undone.')) return;
    outputText.value = '';
    copyBtn.disabled = true;
    form.reset();
    showSections.forEach(cb => cb.checked = false);
    updateWorkOrderVisibility();
    updateCallStatus();
    updateSlaVisibility();
    updateInstallDatetime();
    updateTrainingDatetime();
  });

  /* ── Copy ──────────────────────────────────────────────────────── */
  copyBtn.addEventListener('click', () => {
    const text = outputText.value.trim();
    if (!text) return;

    const succeed = () => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy all'; }, 2000);
    };

    const fallback = () => {
      outputText.focus(); outputText.select();
      document.execCommand('copy') ? succeed()
        : alert('Copy failed — please select the text and press Ctrl+C.');
    };

    navigator.clipboard?.writeText(text).then(succeed).catch(fallback) ?? fallback();
  });
});