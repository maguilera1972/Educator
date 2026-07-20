function initRichTextEditor(editorEl, toolbarEl, options = {}) {
  if (!editorEl || !toolbarEl) return null;

  editorEl.contentEditable = 'true';
  editorEl.classList.add('rich-text-editor__body');
  editorEl.setAttribute('role', 'textbox');
  editorEl.setAttribute('aria-multiline', 'true');

  const onUploadImage = options.onUploadImage;
  const enableImageResize = options.enableImageResize !== false;
  const defaultImageWidth = options.defaultImageWidth || 320;

  let selectedImage = null;
  let resizeBar = null;

  function clampWidth(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return defaultImageWidth;
    return Math.min(600, Math.max(80, n));
  }

  function applyImageWidth(img, width) {
    if (!img) return;
    const w = clampWidth(width);
    img.setAttribute('width', String(w));
    img.style.width = `${w}px`;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.classList.add('rte-image');
  }

  function clearImageSelection() {
    editorEl.querySelectorAll('img.rte-selected').forEach((img) => {
      img.classList.remove('rte-selected');
    });
    selectedImage = null;
    if (resizeBar) resizeBar.hidden = true;
  }

  function selectImage(img) {
    if (!img || !editorEl.contains(img)) return;
    clearImageSelection();
    selectedImage = img;
    img.classList.add('rte-selected');
    applyImageWidth(img, img.getAttribute('width') || img.style.width || defaultImageWidth);
    if (resizeBar) {
      const width = clampWidth(img.getAttribute('width') || defaultImageWidth);
      const range = resizeBar.querySelector('[data-image-width]');
      const label = resizeBar.querySelector('[data-image-width-label]');
      if (range) range.value = String(width);
      if (label) label.textContent = `${width} px`;
      resizeBar.hidden = false;
    }
  }

  function ensureResizeBar() {
    if (!enableImageResize || resizeBar) return resizeBar;
    resizeBar = document.createElement('div');
    resizeBar.className = 'rich-text-editor__resize';
    resizeBar.hidden = true;
    resizeBar.innerHTML = `
      <span class="rich-text-editor__resize-title">Taille de l'image</span>
      <div class="rich-text-editor__resize-presets">
        <button type="button" class="rich-text-editor__btn" data-resize-preset="160">Petite</button>
        <button type="button" class="rich-text-editor__btn" data-resize-preset="240">Moyenne</button>
        <button type="button" class="rich-text-editor__btn" data-resize-preset="320">Large</button>
        <button type="button" class="rich-text-editor__btn" data-resize-preset="480">Très large</button>
      </div>
      <label class="rich-text-editor__resize-slider">
        <span data-image-width-label>320 px</span>
        <input type="range" min="80" max="600" step="10" value="320" data-image-width>
      </label>
    `;
    toolbarEl.insertAdjacentElement('afterend', resizeBar);

    resizeBar.querySelectorAll('[data-resize-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!selectedImage) return;
        applyImageWidth(selectedImage, btn.dataset.resizePreset);
        selectImage(selectedImage);
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    const range = resizeBar.querySelector('[data-image-width]');
    range?.addEventListener('input', () => {
      if (!selectedImage) return;
      applyImageWidth(selectedImage, range.value);
      const label = resizeBar.querySelector('[data-image-width-label]');
      if (label) label.textContent = `${clampWidth(range.value)} px`;
      editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    });

    return resizeBar;
  }

  function insertImageAtCursor(url, width = defaultImageWidth) {
    editorEl.focus();
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return null;

    const img = document.createElement('img');
    img.src = safeUrl;
    img.alt = '';
    applyImageWidth(img, width);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorEl.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorEl.appendChild(img);
    }

    if (enableImageResize) {
      ensureResizeBar();
      selectImage(img);
    }
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    return img;
  }

  function normalizeExistingImages() {
    editorEl.querySelectorAll('img').forEach((img) => {
      applyImageWidth(img, img.getAttribute('width') || img.style.width || defaultImageWidth);
    });
  }

  if (enableImageResize) {
    ensureResizeBar();
    editorEl.addEventListener('click', (e) => {
      const img = e.target?.closest?.('img');
      if (img && editorEl.contains(img)) {
        e.preventDefault();
        selectImage(img);
      } else {
        clearImageSelection();
      }
    });
  }

  toolbarEl.querySelectorAll('[data-command]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.dataset.command;
      editorEl.focus();

      if (command === 'createLink') {
        const url = window.prompt('URL du lien (https://… ou mailto:…)', 'https://');
        if (!url?.trim()) return;
        let href = url.trim();
        if (!/^(https?:\/\/|mailto:)/i.test(href)) {
          href = `https://${href}`;
        }
        document.execCommand('createLink', false, href);
        const selection = window.getSelection();
        const anchor = selection?.anchorNode?.parentElement?.closest?.('a')
          || editorEl.querySelector('a[href]:last-of-type');
        if (anchor) {
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
        return;
      }

      if (command === 'insertImageUrl') {
        const url = window.prompt('URL de l\'image (https://…)', 'https://');
        if (!url?.trim()) return;
        insertImageAtCursor(url.trim());
        return;
      }

      document.execCommand(command, false, null);
    });
  });

  const imageInput = toolbarEl.querySelector('[data-image-upload]');
  if (imageInput && typeof onUploadImage === 'function') {
    imageInput.addEventListener('change', async () => {
      const file = imageInput.files?.[0];
      imageInput.value = '';
      if (!file) return;
      try {
        const url = await onUploadImage(file);
        if (!url) return;
        insertImageAtCursor(url);
      } catch (err) {
        window.alert(err.message || 'Impossible d\'ajouter l\'image.');
      }
    });
  }

  return {
    setHtml(html) {
      editorEl.innerHTML = html || '';
      normalizeExistingImages();
      clearImageSelection();
    },
    getHtml() {
      clearImageSelection();
      normalizeExistingImages();
      return editorEl.innerHTML.trim();
    },
    focus() {
      editorEl.focus();
    },
  };
}

window.initRichTextEditor = initRichTextEditor;
