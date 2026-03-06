const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectButton = document.getElementById('selectButton');
const extractButton = document.getElementById('extractButton');
const previewImage = document.getElementById('previewImage');
const resultText = document.getElementById('resultText');
const spinner = document.getElementById('spinner');
const statusText = document.getElementById('statusText');
const copyButton = document.getElementById('copyButton');
const saveButton = document.getElementById('saveButton');

let selectedImagePath = '';

const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

function getFileExtension(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase();
}

function isValidImagePath(filePath) {
  return validExtensions.includes(getFileExtension(filePath));
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
}

function setPreview(path) {
  selectedImagePath = path;
  previewImage.src = `file://${path}`;
  previewImage.classList.remove('hidden');
  extractButton.disabled = false;
  setStatus('Image ready. Click "Extract Text" to process.');
}

function resetOutput() {
  resultText.value = '';
}

async function processPath(path) {
  if (!path || !isValidImagePath(path)) {
    setStatus('Invalid file type. Please select JPG, JPEG, PNG, WEBP, or BMP.', true);
    return;
  }

  setPreview(path);
  resetOutput();
}

selectButton.addEventListener('click', async () => {
  try {
    const imagePath = await window.electronAPI.openImageDialog();
    if (imagePath) {
      await processPath(imagePath);
    }
  } catch (error) {
    setStatus(error.message || 'Failed to open file picker.', true);
  }
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const filePath = file.path;
  await processPath(filePath);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
  });
});

dropZone.addEventListener('drop', async (event) => {
  const droppedFile = event.dataTransfer?.files?.[0];
  if (!droppedFile) return;

  await processPath(droppedFile.path);
});

extractButton.addEventListener('click', async () => {
  if (!selectedImagePath) {
    setStatus('Please select an image first.', true);
    return;
  }

  spinner.classList.remove('hidden');
  extractButton.disabled = true;
  setStatus('Processing image with Gemini Vision API...');

  try {
    const text = await window.electronAPI.extractTextFromImage(selectedImagePath);
    resultText.value = text;
    setStatus('Text extracted successfully.');
  } catch (error) {
    resultText.value = '';
    setStatus(error.message || 'Failed to extract text.', true);
  } finally {
    spinner.classList.add('hidden');
    extractButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  if (!resultText.value.trim()) {
    setStatus('There is no extracted text to copy.', true);
    return;
  }

  await navigator.clipboard.writeText(resultText.value);
  setStatus('Extracted text copied to clipboard.');
});

saveButton.addEventListener('click', async () => {
  if (!resultText.value.trim()) {
    setStatus('There is no extracted text to save.', true);
    return;
  }

  try {
    const result = await window.electronAPI.saveTextFile(resultText.value);
    if (!result.canceled) {
      setStatus('Text file saved successfully.');
    }
  } catch (error) {
    setStatus(error.message || 'Failed to save text file.', true);
  }
});
