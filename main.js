// Values that trigger "Shipping SLA" to show
const SHIPPING_NOT_YET_DELIVERED = 'Not yet delivered';

// Status values that are omitted from the log output
const EXCLUDED_FROM_OUTPUT = ['not started yet', 'not line item'];

// Excluded shipping and menu statuses
const EXCLUDED_SHIPPING = ['not started yet', 'no line item/ no hw to be shipped.'];
const EXCLUDED_MENU = ['not started yet', 'not line item'];

// Activation statuses to exclude from output
const EXCLUDED_ACTIVATION = ['no need'];

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
  
  // Check if activation should be excluded ("No need" option)
  if (data.activationStatus && !EXCLUDED_ACTIVATION.includes(data.activationStatus.toLowerCase()))
    parts.push(`Activation: ${data.activationStatus || 'Not set'}`);
  
  // Check if shipping status should be excluded
  if (data.shippingStatus && !EXCLUDED_SHIPPING.includes(data.shippingStatus.toLowerCase()))
    parts.push(`Shipping: ${data.shippingStatus || 'Not set'}${slaPart}`);
  
  // Check if menu status should be excluded
  if (data.menuStatus && !EXCLUDED_MENU.includes(data.menuStatus.toLowerCase()))
    parts.push(`Menu: ${data.menuStatus || 'Not set'}`);
  
  // Check if installation status should be excluded
  if (data.installationStatus && !shouldExcludeFromOutput(data.installationStatus)) {
    let installationLine = `Installation: ${data.installationStatus}`;
    if (data.installationStatus === 'Scheduled' && data.installationDatetime) {
      installationLine += ` (Installation Date & Time: ${data.installationDatetime})`;
    }
    parts.push(installationLine);
  }
  
  // Check if training status should be excluded
  if (data.trainingStatus && !shouldExcludeFromOutput(data.trainingStatus)) {
    let trainingLine = `Training: ${data.trainingStatus}`;
    if (data.trainingStatus === 'Scheduled' && data.trainingDatetime) {
      trainingLine += ` (Training Date & Time: ${data.trainingDatetime})`;
    }
    parts.push(trainingLine);
  }
  
  if (data.whatsappTicket)
    parts.push(`WhatsApp Ticket: ${data.whatsappTicket}`);
  if (data.followUpDateTime)
    parts.push(`Next Follow-up: ${data.followUpDateTime}`);
  if (data.followUpNotes)
    parts.push(`Follow-up Notes: ${data.followUpNotes}`);
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
  const installationStatusInput = document.getElementById('installation-status');
  const trainingStatusInput = document.getElementById('training-status');
  const installationDatetimeField = document.getElementById('installation-datetime-field');
  const trainingDatetimeField = document.getElementById('training-datetime-field');
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
    
    // For "Not connected" status, show only WhatsApp ticket and hide other fields
    if (callStatus === 'Not connected') {
      if (whatsappTicketField) whatsappTicketField.style.display = '';
      if (followUpField) followUpField.style.display = 'none';
      if (followUpNotesField) followUpNotesField.style.display = 'none';
      // Hide all form fields and make them not required
      hideAndUnrequireAllFormFields();
    } 
    // For "Call back requested" status, show only Next follow-up and hide other fields
    else if (callStatus === 'Call back requested') {
      if (whatsappTicketField) whatsappTicketField.style.display = 'none';
      if (followUpField) followUpField.style.display = 'none';
      if (followUpNotesField) followUpNotesField.style.display = 'none';
      // Hide all form fields and make them not required
      hideAndUnrequireAllFormFields();
      // Show only the Next follow-up field
      const nextFollowUpInput = document.getElementById('standalone-next-follow-up');
      if (nextFollowUpInput) nextFollowUpInput.parentElement.style.display = '';
    }
    // For "Dropped" status, show free comment and next follow-up
    else if (callStatus === 'Dropped') {
      if (whatsappTicketField) whatsappTicketField.style.display = 'none';
      if (followUpField) followUpField.style.display = 'none';
      if (followUpNotesField) followUpNotesField.style.display = 'none';
      // Hide all form fields and make them not required
      hideAndUnrequireAllFormFields();
      // Show only the Next follow-up field and free comment will show below
      const nextFollowUpInput = document.getElementById('standalone-next-follow-up');
      if (nextFollowUpInput) nextFollowUpInput.parentElement.style.display = '';
    }
    else {
      // Show all form fields again
      showAndRequireAllFormFields();
      // Show WhatsApp ticket field when "Contacted on WhatsApp" is selected
      if (whatsappTicketField) {
        whatsappTicketField.style.display = 
          callStatus === 'Contacted on WhatsApp' ? '' : 'none';
      }
      
      // Show follow-up date/time field for "Contacted on WhatsApp"
      if (followUpField) {
        followUpField.style.display = 
          (callStatus === 'Contacted on WhatsApp') ? '' : 'none';
      }

      // Show follow-up notes field for "Contacted on WhatsApp"
      if (followUpNotesField) {
        followUpNotesField.style.display = 
          (callStatus === 'Contacted on WhatsApp') ? '' : 'none';
      }
    }
  }

  function hideAndUnrequireAllFormFields() {
    const fieldsToHide = [
      'activation-status',
      'shipping-status',
      'shipping-sla',
      'menu-status',
      'installation-status',
      'training-status',
      'standalone-next-follow-up'
    ];
    
    fieldsToHide.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        // Hide the parent label
        field.parentElement.style.display = 'none';
        // Remove required attribute from the field itself
        field.removeAttribute('required');
      }
    });
    
    // Also hide and unrequire the parent fields
    const parentFieldsToHide = ['shipping-sla-field', 'installation-datetime-field', 'training-datetime-field'];
    parentFieldsToHide.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.style.display = 'none';
        const input = field.querySelector('input, select, textarea');
        if (input) input.removeAttribute('required');
      }
    });
  }

  function showAndRequireAllFormFields() {
    const fieldsToShow = [
      'activation-status',
      'shipping-status',
      'menu-status',
      'installation-status',
      'training-status'
    ];
    
    fieldsToShow.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.parentElement.style.display = '';
        // Restore required attribute
        field.setAttribute('required', '');
      }
    });
    
    // Show standalone-next-follow-up but do NOT make it required
    const nextFollowUp = document.getElementById('standalone-next-follow-up');
    if (nextFollowUp) {
      nextFollowUp.parentElement.style.display = '';
      nextFollowUp.removeAttribute('required');
    }
  }

  function updateInstallationDatetimeVisibility() {
    if (!installationStatusInput || !installationDatetimeField) return;
    const isScheduled = installationStatusInput.value === 'Scheduled';
    installationDatetimeField.style.display = isScheduled ? 'flex' : 'none';
  }

  function updateTrainingDatetimeVisibility() {
    if (!trainingStatusInput || !trainingDatetimeField) return;
    const isScheduled = trainingStatusInput.value === 'Scheduled';
    trainingDatetimeField.style.display = isScheduled ? 'flex' : 'none';
  }

  if (shippingStatusInput) {
    shippingStatusInput.addEventListener('change', updateSlaVisibility);
    updateSlaVisibility();
  }

  if (callStatusInput) {
    callStatusInput.addEventListener('change', updateConditionalFields);
    updateConditionalFields();
  }

  if (installationStatusInput) {
    installationStatusInput.addEventListener('change', () => {
      updateInstallationDatetimeVisibility();
    });
    updateInstallationDatetimeVisibility();
  }

  if (trainingStatusInput) {
    trainingStatusInput.addEventListener('change', () => {
      updateTrainingDatetimeVisibility();
    });
    updateTrainingDatetimeVisibility();
  }

  clearBtn.addEventListener('click', () => {
    if (!outputText.value.trim()) {
      form.reset();
      updateSlaVisibility();
      updateConditionalFields();
      updateInstallationDatetimeVisibility();
      updateTrainingDatetimeVisibility();
      return;
    }
    if (!confirm('Clear all log entries? This cannot be undone.')) return;
    form.reset();
    updateSlaVisibility();
    updateConditionalFields();
    updateInstallationDatetimeVisibility();
    updateTrainingDatetimeVisibility();
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
      installationDatetime: document.getElementById('installation-datetime').value,
      trainingStatus: document.getElementById('training-status').value,
      trainingDatetime: document.getElementById('training-datetime').value,
      whatsappTicket: document.getElementById('whatsapp-ticket').value.trim(),
      followUpDateTime: document.getElementById('follow-up-datetime').value,
      followUpNotes: document.getElementById('follow-up-notes').value.trim(),
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
    updateInstallationDatetimeVisibility();
    updateTrainingDatetimeVisibility();
    updateConditionalFields();
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

