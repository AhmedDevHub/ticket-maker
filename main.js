// Values that trigger "Shipping SLA" to show
const SHIPPING_NOT_YET_DELIVERED = 'Not yet delivered';

// Status values that are omitted from the log output
const EXCLUDED_FROM_OUTPUT = ['not started yet', 'not line item'];

const COPY_BTN_LABEL = 'Copy all';
const COPY_BTN_SUCCESS_LABEL = 'Copied!';
const COPY_FEEDBACK_DURATION_MS = 2000;

// Theme toggle functionality
function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  
  // Check for saved theme preference or default to dark mode
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    html.classList.add('light-mode');
    updateThemeIcon(true);
  }
  
  themeToggle.addEventListener('click', () => {
    const isLightMode = html.classList.contains('light-mode');
    
    if (isLightMode) {
      html.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
      updateThemeIcon(false);
    } else {
      html.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
      updateThemeIcon(true);
    }
  });
}

function updateThemeIcon(isLightMode) {
  const themeToggle = document.getElementById('theme-toggle');
  const icon = themeToggle.querySelector('i');
  
  if (isLightMode) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
}

function clearTickets(output, copyBtn, logs) {
  if (logs) logs.length = 0;
  if (output) output.value = '';
  if (copyBtn) copyBtn.disabled = true;
}

function shouldExcludeFromOutput(value) {
  if (!value || !value.trim()) return false;
  return EXCLUDED_FROM_OUTPUT.includes(value.trim().toLowerCase());
}

function buildLogLine(data) {
  const parts = [
    `Customer: ${data.customerName}`,
    `Phone: ${data.customerPhone || '-'}`,
    `Call: ${data.callStatus}`,
  ];
  const slaPart =
    data.shippingStatus === SHIPPING_NOT_YET_DELIVERED && data.shippingSla
      ? ` (${data.shippingSla})`
      : '';
  if (!shouldExcludeFromOutput(data.activationStatus))
    parts.push(`Activation: ${data.activationStatus || 'Not set'}`);
  if (!shouldExcludeFromOutput(data.shippingStatus))
    parts.push(`Shipping: ${data.shippingStatus || 'Not set'}${slaPart}`);
  if (!shouldExcludeFromOutput(data.menuStatus))
    parts.push(`Menu: ${data.menuStatus || 'Not set'}`);
  if (!shouldExcludeFromOutput(data.installationStatus))
    parts.push(`Installation: ${data.installationStatus || 'Not set'}`);
  if (!shouldExcludeFromOutput(data.trainingStatus))
    parts.push(`Training: ${data.trainingStatus || 'Not set'}`);
  if (data.whatsappTicket)
    parts.push(`WhatsApp Ticket: ${data.whatsappTicket}`);
  if (data.followUpDateTime)
    parts.push(`Next Follow-up: ${data.followUpDateTime}`);
  if (data.followUpNotes)
    parts.push(`Follow-up Notes: ${data.followUpNotes}`);
  if (data.nextFollowUp)
    parts.push(`Next Follow up: ${data.nextFollowUp}`);
  if (data.standaloneNextFollowUp)
    parts.push(`Next Follow up: ${data.standaloneNextFollowUp}`);
  const comment = (data.freeComment || '').trim();
  if (comment) parts.push(`Comment: ${comment}`);
  return parts.join('\n');
}

window.addEventListener('DOMContentLoaded', () => {
  // Initialize theme toggle
  initThemeToggle();
  
  const form = document.getElementById('ticket-form');
  const outputText = document.getElementById('output-text');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  const shippingStatusInput = document.getElementById('shipping-status');
  const shippingSlaField = document.getElementById('shipping-sla-field');
  const callStatusInput = document.getElementById('call-status');
  const whatsappTicketField = document.getElementById('whatsapp-ticket-field');
  const followUpField = document.getElementById('follow-up-field');
  const followUpNotesField = document.getElementById('follow-up-notes-field');
  const nextFollowUpField = document.getElementById('next-follow-up-field');
  const logs = [];

  if (!form || !outputText || !copyBtn || !clearBtn) return;

  function updateSlaVisibility() {
    if (!shippingStatusInput || !shippingSlaField) return;
    shippingSlaField.style.display =
      shippingStatusInput.value === SHIPPING_NOT_YET_DELIVERED ? '' : 'none';
  }

  function updateConditionalFields() {
    if (!callStatusInput) return;
    const callStatus = callStatusInput.value;
    
    // Show WhatsApp ticket field when "Contacted on WhatsApp" is selected
    if (whatsappTicketField) {
      whatsappTicketField.style.display = 
        callStatus === 'Contacted on WhatsApp' ? '' : 'none';
    }
    
    // Show follow-up date/time field for "Call back requested" and "Contacted on WhatsApp"
    if (followUpField) {
      followUpField.style.display = 
        (callStatus === 'Call back requested' || callStatus === 'Contacted on WhatsApp') ? '' : 'none';
    }

    // Show follow-up notes field for "Call back requested" and "Contacted on WhatsApp"
    if (followUpNotesField) {
      followUpNotesField.style.display = 
        (callStatus === 'Call back requested' || callStatus === 'Contacted on WhatsApp') ? '' : 'none';
    }

    // Show next follow-up field for "Call back requested" and "Contacted on WhatsApp"
    if (nextFollowUpField) {
      nextFollowUpField.style.display = 
        (callStatus === 'Call back requested' || callStatus === 'Contacted on WhatsApp') ? '' : 'none';
    }
  }

  if (shippingStatusInput) {
    shippingStatusInput.addEventListener('change', updateSlaVisibility);
    updateSlaVisibility();
  }

  if (callStatusInput) {
    callStatusInput.addEventListener('change', updateConditionalFields);
    updateConditionalFields();
  }

  clearBtn.addEventListener('click', () => {
    if (!outputText.value.trim()) {
      form.reset();
      updateSlaVisibility();
      updateConditionalFields();
      return;
    }
    if (!confirm('Clear all log entries? This cannot be undone.')) return;
    form.reset();
    updateSlaVisibility();
    updateConditionalFields();
    clearTickets(outputText, copyBtn, logs);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = {
      customerName: document.getElementById('customer-name').value.trim(),
      customerPhone: document.getElementById('customer-phone').value.trim(),
      callStatus: document.getElementById('call-status').value,
      activationStatus: document.getElementById('activation-status').value,
      shippingStatus: document.getElementById('shipping-status').value,
      shippingSla: document.getElementById('shipping-sla').value,
      menuStatus: document.getElementById('menu-status').value,
      installationStatus: document.getElementById('installation-status').value,
      trainingStatus: document.getElementById('training-status').value,
      whatsappTicket: document.getElementById('whatsapp-ticket').value.trim(),
      followUpDateTime: document.getElementById('follow-up-datetime').value,
      followUpNotes: document.getElementById('follow-up-notes').value.trim(),
      nextFollowUp: document.getElementById('next-follow-up').value.trim(),
      standaloneNextFollowUp: document.getElementById('standalone-next-follow-up').value.trim(),
      freeComment: document.getElementById('free-comment').value,
    };

    if (!data.customerName) {
      alert('Please enter a customer name.');
      return;
    }
    if (!data.callStatus) {
      alert('Please select a call status.');
      return;
    }
    if (data.customerPhone && !/^\d+$/.test(data.customerPhone)) {
      alert('Customer phone must contain numbers only (no spaces or symbols).');
      return;
    }
    if (
      data.shippingStatus === SHIPPING_NOT_YET_DELIVERED &&
      !data.shippingSla
    ) {
      alert('Please select a shipping SLA when shipping is "Not yet delivered".');
      return;
    }

    const line = buildLogLine(data);
    logs.length = 0;
    logs.push(line);
    outputText.value = line;
    copyBtn.disabled = false;

    form.reset();
    updateSlaVisibility();
  });

  copyBtn.addEventListener('click', () => {
    const text = outputText.value.trim();
    if (!text) return;

    function showCopiedFeedback() {
      copyBtn.textContent = COPY_BTN_SUCCESS_LABEL;
      setTimeout(() => {
        copyBtn.textContent = COPY_BTN_LABEL;
      }, COPY_FEEDBACK_DURATION_MS);
    }

    function fallbackCopy() {
      outputText.focus();
      outputText.select();
      try {
        if (document.execCommand('copy')) showCopiedFeedback();
        else alert('Copy failed. Select the text in the box and copy manually (Ctrl+C).');
      } catch (e) {
        alert('Copy failed. Select the text in the box and copy manually (Ctrl+C).');
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(showCopiedFeedback)
        .catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  });
});

