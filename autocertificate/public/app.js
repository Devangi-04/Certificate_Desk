const apiBase = '/api';

const templateListEl = document.getElementById('template-list');
const participantListEl = document.getElementById('participant-list');
const certTableEl = document.getElementById('cert-table');
const templateSelectEl = document.getElementById('template-select');
const participantSelectEl = document.getElementById('participant-select');
const generationLogEl = document.getElementById('generation-log');
const toastEl = document.getElementById('toast');
const statTotalEl = document.getElementById('stat-total');
const statSentEl = document.getElementById('stat-sent');

// Placement editor elements
const placementModal = document.getElementById('placement-modal');
const placementModalClose = document.getElementById('placement-modal-close');
const templateCanvas = document.getElementById('template-canvas');
const namePreview = document.getElementById('name-preview');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeInput = document.getElementById('font-size-input');
const fontSizeValue = document.getElementById('font-size-value');
const resetPlacementBtn = document.getElementById('reset-placement');
const savePlacementBtn = document.getElementById('save-placement');
const autoPlacementBtn = document.getElementById('auto-placement');
const alignToggle = document.getElementById('align-toggle');
const nudgeControls = document.getElementById('nudge-controls');
const positionBadge = document.getElementById('position-badge');
const colorToggle = document.getElementById('color-toggle');

const templateForm = document.getElementById('template-form');
const participantForm = document.getElementById('participant-form');
const generateForm = document.getElementById('generate-form');

const refreshTemplatesBtn = document.getElementById('refresh-templates');
const refreshParticipantsBtn = document.getElementById('refresh-participants');
const refreshCertificatesBtn = document.getElementById('refresh-certificates');
const exportCertificatesBtn = document.getElementById('export-certificates');
const exportExcelBtn = document.getElementById('export-excel');

// Placement editor state
let currentTemplate = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let canvasImage = null;
let placementData = { x: 0.5, y: 0.5, fontSize: 36, align: 'center', color: '#f5f7ff' };
let shouldAutoDetectPlacement = false;
let shouldAutoSetColor = false;

function showToast(message, type = 'info') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.dataset.type = type;
  toastEl.hidden = false;
  toastEl.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove('show');
    toastEl.hidden = true;
  }, 3500);
}

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error || 'Request failed');
  }
  return payload?.data ?? payload;
}

async function uploadMultipart(path, formData) {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    body: formData,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error || 'Upload failed');
  }
  return payload?.data ?? payload;
}

function renderTemplates(templates = []) {
  if (!templateListEl) return;
  templateListEl.innerHTML = templates
    .map(
      (t) => `
        <div class="item" data-id="${t.id}">
          <div>
            <strong>${t.original_name}</strong>
            <div><small>${Math.round(t.file_size / 1024)} KB • ${new Date(t.uploaded_at).toLocaleString()}</small></div>
          </div>
          <div class="item-actions">
            <span class="status-pill success">Ready</span>
            <button class="ghost" data-action="edit-placement" data-id="${t.id}" data-name="${t.original_name}">Edit Placement</button>
            <button class="ghost danger" data-action="delete-template" data-id="${t.id}">Delete</button>
          </div>
        </div>`
    )
    .join('');
  templateSelectEl.innerHTML = templates
    .map((t) => `<option value="${t.id}">${t.original_name}</option>`)
    .join('');
}

function renderParticipants(participants = []) {
  if (!participantListEl) return;
  participantListEl.innerHTML = participants
    .slice(0, 12)
    .map(
      (p) => `
        <div class="pill">
          <span class="pill-name">${p.full_name}</span>
          <span class="pill-email">${p.email}</span>
          <button class="pill-delete" onclick="deleteParticipant(${p.id})" title="Delete participant">×</button>
        </div>`
    )
    .join('');
  if (participants.length > 12) {
    participantListEl.innerHTML += `<small>+${participants.length - 12} more participants</small>`;
  }
  participantSelectEl.innerHTML = participants
    .map((p) => `<option value="${p.id}">${p.full_name} — ${p.email}</option>`)
    .join('');
}

function renderCertificates(certificates = []) {
  if (!certTableEl) return;
  certTableEl.innerHTML = certificates
    .map((c) => {
      const pdfLink = c.pdf_path
        ? `<a href="/${c.pdf_path}" target="_blank">Download</a>`
        : '<span>—</span>';
      return `
        <tr>
          <td>${c.full_name}</td>
          <td>${c.email}</td>
          <td>${c.template_name || '—'}</td>
          <td>${pdfLink}</td>
          <td><span class="status-pill ${c.status}">${c.status}</span></td>
          <td><span class="status-pill ${c.delivery_status}">${c.delivery_status}</span></td>
          <td>
            <button class="ghost" data-action="resend" data-id="${c.id}">Resend</button>
          </td>
        </tr>`;
    })
    .join('');

  const totalGenerated = certificates.filter((c) => c.status === 'generated').length;
  const totalSent = certificates.filter((c) => c.delivery_status === 'sent').length;
  statTotalEl.textContent = totalGenerated;
  statSentEl.textContent = totalSent;
}

async function loadTemplates() {
  try {
    const data = await fetchJSON('/templates');
    renderTemplates(data.templates || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadParticipants() {
  try {
    const data = await fetchJSON('/participants');
    renderParticipants(data.participants || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteParticipant(participantId) {
  if (!confirm('Are you sure you want to delete this participant?')) {
    return;
  }
  
  try {
    await fetchJSON(`/participants/${participantId}`, {
      method: 'DELETE'
    });
    showToast('Participant deleted successfully');
    await loadParticipants();
  } catch (err) {
    showToast(err.message || 'Failed to delete participant', 'error');
  }
}

async function loadCertificates() {
  try {
    const data = await fetchJSON('/certificates');
    renderCertificates(data.certificates || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getSelectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions || []).map((opt) => opt.value);
}

if (templateForm) {
  templateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(templateForm);
    try {
      await uploadMultipart('/templates/upload', formData);
      showToast('Template uploaded successfully');
      templateForm.reset();
      await loadTemplates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

if (participantForm) {
  participantForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(participantForm);
    const sheetFile = formData.get('sheet');

    if (!sheetFile || !sheetFile.name) {
      showToast('Please select a spreadsheet file to import.', 'error');
      return;
    }

    try {
      const result = await uploadMultipart('/participants/import', formData);
      showToast(`Imported ${result.participantsProcessed} participants`);
      participantForm.reset();
      await loadParticipants();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

if (generateForm) {
  generateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const templateId = templateSelectEl.value;
    if (!templateId) {
      showToast('Select a template first', 'error');
      return;
    }
    const participantIds = getSelectedValues(participantSelectEl);
    const formData = new FormData(generateForm);
    const payload = {
      templateId: Number(templateId),
      participantIds: participantIds.map(Number),
      sendEmail: formData.get('sendEmail') === 'on',
      eventName: formData.get('eventName')?.trim() || undefined,
    };
    try {
      generationLogEl.textContent = 'Running generation...\n';
      const summary = await fetchJSON('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      generationLogEl.textContent += JSON.stringify(summary, null, 2);
      showToast('Certificates generated successfully');
      await loadCertificates();
    } catch (err) {
      generationLogEl.textContent += `Error: ${err.message}`;
      showToast(err.message, 'error');
    }
  });
}

if (refreshTemplatesBtn) refreshTemplatesBtn.addEventListener('click', loadTemplates);
if (refreshParticipantsBtn) refreshParticipantsBtn.addEventListener('click', loadParticipants);
if (refreshCertificatesBtn) refreshCertificatesBtn.addEventListener('click', loadCertificates);
if (exportCertificatesBtn)
  exportCertificatesBtn.addEventListener('click', async () => {
    exportCertificatesBtn.disabled = true;
    try {
      const response = await fetch(`${apiBase}/certificates/export`, {
        headers: { Accept: 'text/csv' },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to export CSV');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `certificate-dispatch-${timestamp}.csv`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully');
    } catch (err) {
      showToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      exportCertificatesBtn.disabled = false;
    }
  });

if (exportExcelBtn)
  exportExcelBtn.addEventListener('click', async () => {
    exportExcelBtn.disabled = true;
    try {
      const response = await fetch(`${apiBase}/certificates/export/excel`, {
        headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to export Excel');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `certificate-dispatch-${timestamp}.xlsx`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Excel exported successfully');
    } catch (err) {
      showToast(err.message || 'Failed to export Excel', 'error');
    } finally {
      exportExcelBtn.disabled = false;
    }
  });

if (templateListEl) {
  templateListEl.addEventListener('click', async (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    
    const templateId = target.dataset.id;
    const action = target.dataset.action;
    
    if (action === 'delete-template') {
      if (!templateId) return;
      target.disabled = true;
      try {
        await fetchJSON(`/templates/${templateId}`, { method: 'DELETE' });
        showToast('Template deleted');
        await loadTemplates();
      } catch (err) {
        showToast(err.message, 'error');
        target.disabled = false;
      }
    } else if (action === 'edit-placement') {
      if (!templateId) return;
      try {
        const templates = await fetchJSON('/templates');
        const template = templates.templates.find(t => t.id == templateId);
        if (template) {
          openPlacementModal(template);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}

if (certTableEl) {
  certTableEl.addEventListener('click', async (event) => {
    const target = event.target.closest('button[data-action="resend"]');
    if (!target) return;
    const certId = target.dataset.id;
    target.disabled = true;
    try {
      await fetchJSON(`/certificates/${certId}/send`, { method: 'POST', body: JSON.stringify({}) });
      showToast('Certificate resent successfully');
      await loadCertificates();
    } catch (err) {
      showToast(err.message, 'error');
      target.disabled = false;
    }
  });
}

// Placement Editor Functions
function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function normalizeRatio(value, fallback = 0.5) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = Number(value);
  return Number.isNaN(num) ? fallback : clamp01(num);
}

function normalizeFontSize(value, fallback = 36) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.max(12, Math.min(96, num));
}

function normalizeColor(value, fallback = '#f5f7ff') {
  if (typeof value !== 'string') return fallback;
  const hex = value.trim().toLowerCase();
  if (/^#?[0-9a-f]{6}$/.test(hex)) {
    return hex.startsWith('#') ? hex : `#${hex}`;
  }
  return fallback;
}

function isLightColor(hex) {
  if (!hex) return true;
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  if (Number.isNaN(bigint)) return true;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150;
}

function setFontSize(value) {
  const normalized = normalizeFontSize(value, placementData.fontSize);
  placementData.fontSize = normalized;
  if (fontSizeSlider) fontSizeSlider.value = normalized;
  if (fontSizeInput) fontSizeInput.value = normalized;
  if (fontSizeValue) fontSizeValue.textContent = `${normalized}px`;
  updateNamePreview();
}

function updateColorButtons() {
  if (!colorToggle) return;
  const buttons = colorToggle.querySelectorAll('button[data-color]');
  buttons.forEach((btn) => {
    const isActive =
      btn.dataset.color?.toLowerCase() === (placementData.color || '').toLowerCase();
    btn.classList.toggle('active', isActive);
  });
}

function openPlacementModal(template) {
  console.log('=== OPENING PLACEMENT MODAL ===');
  console.log('Template data from server:', template);
  
  currentTemplate = template;
  placementModal.hidden = false;
  
  // Load existing placement data or use defaults
  placementData = {
    pixelX: template.text_x_pixels,
    pixelY: template.text_y_pixels,
    canvasWidth: template.canvas_width,
    canvasHeight: template.canvas_height,
    fontSize: normalizeFontSize(template.text_font_size, 36),
    align: template.text_align || 'center',
    color: normalizeColor(template.text_color_hex, '#f5f7ff'),
  };

  // Derive ratios for preview, or default to center if no pixel data exists
  if (placementData.pixelX !== null && placementData.canvasWidth > 0) {
    placementData.x = placementData.pixelX / placementData.canvasWidth;
  } else {
    placementData.x = 0.5;
  }

  if (placementData.pixelY !== null && placementData.canvasHeight > 0) {
    placementData.y = placementData.pixelY / placementData.canvasHeight;
  } else {
    placementData.y = 0.5;
  }
  
  console.log('Loaded placement data:', {
    template: template.original_name,
    text_x_ratio: template.text_x_ratio,
    text_y_ratio: template.text_y_ratio,
    loadedPlacement: placementData
  });
  
  console.log('POSITION DEBUG ON LOAD:', {
    savedY: template.text_y_ratio,
    placementY: placementData.y,
    canvasHeight: templateCanvas?.height || 'canvas not loaded yet'
  });
  
  shouldAutoDetectPlacement = template.text_x_ratio == null || template.text_y_ratio == null;
  shouldAutoSetColor = !template.text_color_hex;
  
  console.log('Auto-detect flags:', {
    shouldAutoDetectPlacement,
    shouldAutoSetColor
  });
  
  // Load template image/PDF preview
  loadTemplateImage(template.file_path, template.mime_type);
  
  // Initialize controls
  setFontSize(placementData.fontSize);
  updateAlignButtons();
  updateColorButtons();
  
  // The name preview will be updated once the template image is loaded
  // by the onTemplateRenderComplete function.
}

function loadTemplateImage(filePath, mimeType) {
  if (!filePath) return;
  
  if (mimeType === 'application/pdf') {
    renderPdfPreview(filePath);
  } else {
    const img = new Image();
    img.onload = () => {
      canvasImage = img;
      renderCanvas();
      onTemplateRenderComplete();
    };
    img.onerror = () => {
      showToast('Failed to load template image', 'error');
    };
    img.src = filePath;
  }
}

function renderPdfPreview(filePath) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('PDF library not loaded', 'error');
    return;
  }
  
  pdfjsLib.getDocument(filePath).promise.then(pdf => {
    pdf.getPage(1).then(page => {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = templateCanvas;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      page.render(renderContext).promise.then(() => {
        canvasImage = canvas;
        onTemplateRenderComplete();
      });
    });
  }).catch(err => {
    showToast('Failed to load PDF: ' + err.message, 'error');
  });
}

function renderCanvas() {
  if (!canvasImage || !templateCanvas) return;
  
  const ctx = templateCanvas.getContext('2d', { willReadFrequently: true });
  if (canvasImage instanceof HTMLCanvasElement) {
    ctx.drawImage(canvasImage, 0, 0);
  } else {
    templateCanvas.width = canvasImage.width;
    templateCanvas.height = canvasImage.height;
    ctx.drawImage(canvasImage, 0, 0);
  }
}

function onTemplateRenderComplete() {
  updateNamePreview();
  if (shouldAutoDetectPlacement) {
    shouldAutoDetectPlacement = false;
    autoDetectPlacement();
  }
  if (shouldAutoSetColor) {
    shouldAutoSetColor = false;
    autoDetectTextColor();
  }
}

function autoDetectTextColor() {
  if (!canvasImage || !templateCanvas) return;
  
  const ctx = templateCanvas.getContext('2d', { willReadFrequently: true });
  const centerX = Math.floor(templateCanvas.width * placementData.x);
  const centerY = Math.floor(templateCanvas.height * placementData.y);
  const sampleSize = 50;
  
  try {
    const imageData = ctx.getImageData(
      Math.max(0, centerX - sampleSize/2),
      Math.max(0, centerY - sampleSize/2),
      Math.min(sampleSize, templateCanvas.width - centerX + sampleSize/2),
      Math.min(sampleSize, templateCanvas.height - centerY + sampleSize/2)
    );
    
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      r += imageData.data[i];
      g += imageData.data[i + 1];
      b += imageData.data[i + 2];
      count++;
    }
    
    if (count > 0) {
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      placementData.color = luminance > 150 ? '#111827' : '#f5f7ff';
      updateColorButtons();
      updateNamePreview();
    }
  } catch (err) {
    console.warn('Failed to auto-detect text color:', err);
  }
}

function updateAlignButtons() {
  if (!alignToggle) return;
  const buttons = alignToggle.querySelectorAll('button[data-align-option]');
  buttons.forEach((btn) => {
    if (btn.dataset.alignOption === (placementData.align || 'center')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function resetPlacement() {
  placementData = { x: 0.5, y: 0.5, fontSize: 36, align: 'center', color: '#f5f7ff' };
  setFontSize(placementData.fontSize);
  updateAlignButtons();
  updateColorButtons();
  updateNamePreview();
}

async function savePlacement() {
  if (!currentTemplate) {
    console.error('No current template selected');
    return;
  }

  try {
    const saveData = {
      // Send raw pixel data and canvas dimensions
      text_x_pixels: placementData.pixelX,
      text_y_pixels: placementData.pixelY,
      canvas_width: placementData.canvasWidth,
      canvas_height: placementData.canvasHeight,
      text_font_size: placementData.fontSize,
      text_align: placementData.align,
      text_color_hex: placementData.color
    };
    
    console.log('=== SAVING PLACEMENT ===');
    console.log('Current template ID:', currentTemplate.id);
    console.log('Current template name:', currentTemplate.original_name);
    console.log('Placement data being saved:', saveData);
    console.log('Raw placementData object:', placementData);
    
    // Also show what this should look like in PDF
    const expectedPdfX = 600 * placementData.x; // Assuming 600px wide PDF
    const expectedPdfY = 400 * placementData.y; // Assuming 400px tall PDF
    console.log('Expected PDF position:', { x: expectedPdfX, y: expectedPdfY });
    
    const response = await fetchJSON(`/templates/${currentTemplate.id}/placement`, {
      method: 'PUT',
      body: JSON.stringify(saveData)
    });
    
    console.log('Save response:', response);
    console.log('Save response details:', JSON.stringify(response, null, 2));
    
    // Verify the data was saved correctly by checking the response
    if (response && response.template) {
      console.log('Updated template data:', response.template);
      console.log('Saved coordinates:', {
        x: response.template.text_x_ratio,
        y: response.template.text_y_ratio,
        fontSize: response.template.text_font_size,
        align: response.template.text_align
      });
    }
    showToast('Placement saved successfully');
    placementModal.hidden = true;
    await loadTemplates();
  } catch (err) {
    console.error('=== SAVE ERROR ===');
    console.error('Error saving placement:', err);
    console.error('Error details:', err.message);
    showToast(err.message || 'Failed to save placement', 'error');
  }
}

function autoDetectPlacement() {
  // Auto-detect disabled due to coordinate system mismatch
  // Please use manual positioning by dragging the name
  console.log('Auto-detect disabled. Please position the name manually by dragging.');
}

function evaluateRegion(ctx, width, height, region) {
  const sampleWidth = Math.floor(width * region.width);
  const sampleHeight = Math.floor(height * region.height);
  const startX = Math.floor(width * region.x - sampleWidth / 2);
  const startY = Math.floor(height * region.y - sampleHeight / 2);
  
  try {
    const imageData = ctx.getImageData(
      Math.max(0, startX),
      Math.max(0, startY),
      Math.min(sampleWidth, width - startX),
      Math.min(sampleHeight, height - startY)
    );
    
    let variance = 0;
    let mean = 0;
    const data = imageData.data;
    
    // Calculate mean brightness
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      mean += brightness;
    }
    mean /= (data.length / 4);
    
    // Calculate variance (lower variance = more uniform area)
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(brightness - mean, 2);
    }
    variance /= (data.length / 4);
    
    // Return score based on low variance and reasonable brightness
    return 255 - Math.sqrt(variance);
  } catch (err) {
    return 0;
  }
}

// Click-to-place handler
function handleCanvasClick(event) {
  if (!canvasImage || !templateCanvas) return;

  const canvasRect = templateCanvas.getBoundingClientRect();
  const displayedWidth = canvasRect.width || templateCanvas.width || 1;
  const displayedHeight = canvasRect.height || templateCanvas.height || 1;
  const xCss = event.clientX - canvasRect.left;
  const yCss = event.clientY - canvasRect.top;

  // Store raw pixel coordinates and canvas dimensions
  placementData.pixelX = xCss;
  placementData.pixelY = yCss;
  placementData.canvasWidth = displayedWidth;
  placementData.canvasHeight = displayedHeight;

  // Update the ratios for preview purposes only
  placementData.x = clamp01(xCss / displayedWidth);
  placementData.y = clamp01(yCss / displayedHeight);

  console.log('CLICK CAPTURED:', {
    pixelCoords: { x: xCss, y: yCss },
    canvasSize: {
      intrinsic: { width: templateCanvas.width, height: templateCanvas.height },
      displayed: { width: displayedWidth, height: displayedHeight },
    },
  });

  updateNamePreview();
}

function getPreviewTopLeft() {
  if (!canvasImage || !templateCanvas) return { left: 0, top: 0 };
  
  const ctx = templateCanvas.getContext('2d', { willReadFrequently: true });
  ctx.font = `${placementData.fontSize}px Helvetica, Arial, sans-serif`;
  
  // Use actual preview text width for accurate centering
  const previewText = namePreview.textContent || "Participant Name";
  const canvasTextWidth = ctx.measureText(previewText).width;
  
  // The anchor point is center position where user clicked/dragged
  const anchorX = placementData.pixelX;
  const anchorY = placementData.pixelY;

  // For preview, apply alignment using actual preview text width
  let drawX = anchorX;
  if (placementData.align === 'center') {
    drawX = anchorX - canvasTextWidth / 2;
  } else if (placementData.align === 'right') {
    drawX = anchorX - canvasTextWidth;
  }

  console.log('getPreviewTopLeft:', {
    anchorX, anchorY,
    align: placementData.align,
    previewText,
    canvasTextWidth,
    drawX,
    note: 'Using actual preview text width for accurate centering'
  });

  return { left: drawX, top: anchorY };
}

// Rest of the code remains the same
function setPlacementFromTopLeft(x, y) {
  if (!canvasImage || !templateCanvas) return;

  const canvasRect = templateCanvas.getBoundingClientRect();
  const displayedWidth = canvasRect.width || templateCanvas.width || 1;
  const displayedHeight = canvasRect.height || templateCanvas.height || 1;

  // For center alignment, save the center position directly
  // Don't try to calculate with text width here
  let anchorX = x;
  if (placementData.align === 'center') {
    // x is the center position where user clicked/dragged
    anchorX = x;
  } else if (placementData.align === 'right') {
    // x is the right edge position
    anchorX = x;
  }

  const anchorY = y; // top-of-text in canvas coordinates

  placementData.x = clamp01(anchorX / displayedWidth);
  placementData.y = clamp01(anchorY / displayedHeight);
  placementData.pixelX = anchorX;
  placementData.pixelY = anchorY;
  placementData.canvasWidth = displayedWidth;
  placementData.canvasHeight = displayedHeight;

  console.log('DRAG POSITION CAPTURED:', {
    canvasPixelTopLeft: { x, y },
    anchorPixel: { x: anchorX, y: anchorY },
    canvasSize: {
      intrinsic: { width: templateCanvas.width, height: templateCanvas.height },
      displayed: { width: displayedWidth, height: displayedHeight },
    },
    normalizedAnchor: { x: placementData.x, y: placementData.y },
    align: placementData.align,
    note: 'Saved as anchor point (matches PDF generation coordinates)'
  });

  updateNamePreview();
}

if (alignToggle) {
  alignToggle.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-align-option]');
    if (!target) return;
    placementData.align = target.dataset.alignOption;
    updateAlignButtons();
    updateNamePreview();
  });
}

if (resetPlacementBtn) {
  resetPlacementBtn.addEventListener('click', resetPlacement);
}

if (placementModalClose) {
  placementModalClose.addEventListener('click', () => {
    placementModal.hidden = true;
  });
}

if (savePlacementBtn) {
  savePlacementBtn.addEventListener('click', savePlacement);
}

// Auto-detect button removed due to coordinate system issues

if (nudgeControls) {
  nudgeControls.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-nudge]');
    if (!btn || !templateCanvas) return;
    const step = 1; // Nudge by 1 pixel
    switch (btn.dataset.nudge) {
      case 'up':
        placementData.pixelY = (placementData.pixelY || 0) - step;
        break;
      case 'down':
        placementData.pixelY = (placementData.pixelY || 0) + step;
        break;
      case 'left':
        placementData.pixelX = (placementData.pixelX || 0) - step;
        break;
      case 'right':
        placementData.pixelX = (placementData.pixelX || 0) + step;
        break;
      default:
        break;
    }
    updateNamePreview();
  });
}

// Color toggle event listener
if (colorToggle) {
  colorToggle.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-color]');
    if (!target) return;
    placementData.color = target.dataset.color;
    updateColorButtons();
    updateNamePreview();
  });
}

// Font size event listeners
if (fontSizeSlider) {
  fontSizeSlider.addEventListener('input', (e) => {
    setFontSize(e.target.value);
  });
}

if (fontSizeInput) {
  fontSizeInput.addEventListener('input', (e) => {
    setFontSize(e.target.value);
  });
}

// Modal close on backdrop click
if (placementModal) {
  placementModal.addEventListener('click', (e) => {
    if (e.target === placementModal) {
      placementModal.hidden = true;
    }
  });
}

// Click-to-place event listener
if (templateCanvas) {
  templateCanvas.addEventListener('click', handleCanvasClick);
}

let isUpdatingPreview = false;

function updateNamePreview() {
  if (isUpdatingPreview) return; // Prevent infinite loops
  isUpdatingPreview = true;
  
  if (!namePreview) {
    console.log('updateNamePreview: namePreview element not found');
    isUpdatingPreview = false;
    return;
  }
  
  if (!canvasImage) {
    console.log('updateNamePreview: canvasImage not loaded, showing default position');
    // Show name preview at center of canvas container as fallback
    const container = templateCanvas.parentElement;
    if (container) {
      namePreview.style.left = '50%';
      namePreview.style.top = '50%';
      namePreview.style.transform = 'translate(-50%, -50%)';
      namePreview.style.fontSize = `${placementData.fontSize}px`;
      namePreview.style.color = placementData.color || '#f5f7ff';
      namePreview.dataset.align = placementData.align || 'center';
    }
    isUpdatingPreview = false;
    return;
  }
  
  console.log('updateNamePreview: canvasImage loaded, calling getPreviewTopLeft');
  const container = templateCanvas.parentElement;
  const canvasRect = templateCanvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const { left, top } = getPreviewTopLeft();

  console.log('updateNamePreview positioning:', {
    canvasRect: { left: canvasRect.left, top: canvasRect.top },
    containerRect: { left: containerRect.left, top: containerRect.top },
    calculatedPosition: { left, top },
    finalLeft: (canvasRect.left - containerRect.left) + left,
    finalTop: (canvasRect.top - containerRect.top) + top
  });

  // Reset transform and use absolute positioning
  namePreview.style.transform = 'none';
  // The offset of the canvas within its container
  const offsetX = canvasRect.left - containerRect.left;
  const offsetY = canvasRect.top - containerRect.top;

  // Final position is the canvas offset + text position on canvas
  namePreview.style.left = `${offsetX + left}px`;
  namePreview.style.top = `${offsetY + top}px`;
  namePreview.style.fontSize = `${placementData.fontSize}px`;
  namePreview.style.color = placementData.color || '#f5f7ff';
  const lightText = isLightColor(placementData.color);
  namePreview.style.textShadow = lightText
    ? '0 2px 6px rgba(0,0,0,0.45)'
    : '0 2px 8px rgba(255,255,255,0.45)';
  namePreview.dataset.align = placementData.align || 'center';
  if (positionBadge) {
    const percentX = Math.round(placementData.x * 100);
    const percentY = Math.round(placementData.y * 100);
    positionBadge.textContent = `X ${percentX}% · Y ${percentY}% (PDF coords)`;
  }
  
  isUpdatingPreview = false;
}

function capturePlacementDiagnostics() {
  const canvasRect = templateCanvas?.getBoundingClientRect();
  const containerRect = templateCanvas?.parentElement?.getBoundingClientRect();
  const previewStyle = namePreview ? window.getComputedStyle(namePreview) : null;
  const diagnostics = {
    canvas: {
      width: templateCanvas?.width ?? null,
      height: templateCanvas?.height ?? null,
      rect: canvasRect
        ? {
            left: canvasRect.left,
            top: canvasRect.top,
            width: canvasRect.width,
            height: canvasRect.height,
          }
        : null,
    },
    containerRect: containerRect
      ? {
          left: containerRect.left,
          top: containerRect.top,
          width: containerRect.width,
          height: containerRect.height,
        }
      : null,
    placementData: { ...placementData },
    namePreviewStyle: previewStyle
      ? {
          left: previewStyle.left,
          top: previewStyle.top,
          fontSize: previewStyle.fontSize,
          color: previewStyle.color,
          transform: previewStyle.transform,
        }
      : null,
  };
  console.log('PLACEMENT DIAGNOSTICS', diagnostics);
  return diagnostics;
}

window.capturePlacementDiagnostics = capturePlacementDiagnostics;
