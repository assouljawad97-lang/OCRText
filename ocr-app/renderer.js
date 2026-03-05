const selectBtn = document.getElementById('selectBtn');
const extractBtn = document.getElementById('extractBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const dropzone = document.getElementById('dropzone');
const statusEl = document.getElementById('status');
const outputText = document.getElementById('outputText');
const previewList = document.getElementById('previewList');
const previewTemplate = document.getElementById('previewItemTemplate');

let selectedImagePaths = [];
let latestResults = [];

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.heic', '.heif']);

function getExtension(filePath) {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot >= 0 ? filePath.slice(lastDot).toLowerCase() : '';
}

function getBaseName(filePath) {
  return filePath.split(/[/\\]/).pop();
}

function setStatus(message) {
  statusEl.textContent = message;
}

function getSelectedLanguages() {
  const checked = [...document.querySelectorAll('.language-picker input[type="checkbox"]:checked')]
    .map((input) => input.value);
  return checked.length ? checked : ['eng'];
}

function normalizeDroppedFiles(fileList) {
  const paths = [];
  for (const file of fileList) {
    const ext = getExtension(file.path || '');
    if (supportedExtensions.has(ext)) {
      paths.push(file.path);
    }
  }
  return paths;
}

function renderPreviewItems(items) {
  previewList.innerHTML = '';
  for (const item of items) {
    const node = previewTemplate.content.cloneNode(true);
    node.querySelector('img').src = `file://${item.previewPath || item.imagePath}`;
    node.querySelector('.filename').textContent = getBaseName(item.imagePath);
    node.querySelector('.doc-type').textContent = `Detected type: ${item.documentType}`;
    node.querySelector('.confidence').textContent = `Confidence: ${Number(item.confidence || 0).toFixed(2)}%`;
    previewList.appendChild(node);
  }
}

function setSelectedImages(paths) {
  selectedImagePaths = [...new Set(paths)];
  extractBtn.disabled = selectedImagePaths.length === 0;
  setStatus(selectedImagePaths.length
    ? `${selectedImagePaths.length} image(s) ready for OCR.`
    : 'Select one or more images to begin.');

  if (!selectedImagePaths.length) {
    previewList.innerHTML = '';
  }
}

selectBtn.addEventListener('click', async () => {
  const paths = await window.ocrApi.openFileDialog();
  if (paths.length) {
    setSelectedImages(paths);
  }
});

extractBtn.addEventListener('click', async () => {
  if (!selectedImagePaths.length) return;

  extractBtn.disabled = true;
  copyBtn.disabled = true;
  saveBtn.disabled = true;
  outputText.value = '';

  setStatus('Running OCR, preprocessing image(s), and detecting document type...');

  try {
    latestResults = await window.ocrApi.processOCR({
      imagePaths: selectedImagePaths,
      languages: getSelectedLanguages()
    });

    const text = latestResults
      .map((result, index) => [
        `===== Image ${index + 1}: ${getBaseName(result.imagePath)} =====`,
        `Document type: ${result.documentType}`,
        `Confidence: ${Number(result.confidence || 0).toFixed(2)}%`,
        '',
        result.text || '[No text detected]',
        ''
      ].join('\n'))
      .join('\n');

    outputText.value = text;
    renderPreviewItems(latestResults);

    copyBtn.disabled = !text.trim();
    saveBtn.disabled = !text.trim();

    setStatus(`OCR complete for ${latestResults.length} image(s).`);
  } catch (error) {
    console.error(error);
    setStatus(`OCR failed: ${error.message}`);
  } finally {
    extractBtn.disabled = false;
  }
});

clearBtn.addEventListener('click', () => {
  selectedImagePaths = [];
  latestResults = [];
  outputText.value = '';
  previewList.innerHTML = '';
  copyBtn.disabled = true;
  saveBtn.disabled = true;
  extractBtn.disabled = true;
  setStatus('State reset. Select new image(s) to begin.');
});

copyBtn.addEventListener('click', async () => {
  if (!outputText.value.trim()) return;
  await navigator.clipboard.writeText(outputText.value);
  setStatus('Copied extracted text to clipboard.');
});

saveBtn.addEventListener('click', async () => {
  if (!outputText.value.trim()) return;

  const result = await window.ocrApi.saveTextResult({
    defaultName: `ocr-output-${Date.now()}.txt`,
    content: outputText.value
  });

  if (result.saved) {
    setStatus(`Saved OCR text to: ${result.filePath}`);
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.remove('drag-over');
  });
});

dropzone.addEventListener('drop', (event) => {
  const files = event.dataTransfer?.files;
  if (!files || !files.length) return;

  const paths = normalizeDroppedFiles(files);
  if (!paths.length) {
    setStatus('No supported image files were dropped.');
    return;
  }

  setSelectedImages(paths);
});

(async function bootstrap() {
  const preferredLanguages = await window.ocrApi.getPreferredLanguages();
  if (Array.isArray(preferredLanguages)) {
    const checkboxes = [...document.querySelectorAll('.language-picker input[type="checkbox"]')];
    checkboxes.forEach((checkbox) => {
      checkbox.checked = preferredLanguages.includes(checkbox.value);
    });
  }
})();
