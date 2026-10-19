if (!requireAuth()) throw new Error();

let profileData = null;
let selectedGenericId = 0;
let bioEditor = null;
let selectedAvatarFile = null;

async function uploadBioImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const result = await API.request('/api/profile/bio/images', {
    method: 'POST',
    body: fd,
  });
  return result.url;
}

async function loadProfile() {
  profileData = await API.request('/api/profile/avatar');
  const { user, gravatar_available, generics, profile_bio: profileBio } = profileData;

  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;

  const statusEl = document.getElementById('gravatar-status');
  if (user.avatar_source === 'upload') {
    statusEl.textContent = 'Using your uploaded photo';
    statusEl.className = 'status ok';
  } else if (gravatar_available) {
    statusEl.textContent = 'Gravatar detected for your email';
    statusEl.className = 'status ok';
  } else {
    statusEl.textContent = 'No Gravatar found — upload a photo or choose a generic avatar below';
    statusEl.className = 'status';
  }

  const current = document.getElementById('current-avatar');
  current.src = user.avatar_url;
  current.dataset.fallback = user.gravatar_fallback || generics[0]?.url || '/avatars/generic-0.svg';

  selectedGenericId = user.avatar_generic_id ?? 0;
  const mode = user.avatar_mode || 'auto';
  document.querySelectorAll('input[name="avatar_mode"]').forEach((input) => {
    input.checked = input.value === mode;
  });

  const uploadRadio = document.querySelector('input[name="avatar_mode"][value="upload"]');
  if (uploadRadio) {
    uploadRadio.disabled = !user.avatar_filename;
  }

  const grid = document.getElementById('generic-grid');
  grid.innerHTML = generics.map((g) => `
    <button type="button" class="generic-avatar-btn${g.id === selectedGenericId ? ' selected' : ''}" data-id="${g.id}" title="${g.name}">
      <img src="${g.url}" alt="${g.name}" class="avatar avatar-md">
      <span>${g.name}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.generic-avatar-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedGenericId = parseInt(btn.dataset.id, 10);
      grid.querySelectorAll('.generic-avatar-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      current.src = generics.find((g) => g.id === selectedGenericId)?.url || current.src;
      document.querySelector('input[name="avatar_mode"][value="generic"]').checked = true;
    });
  });

  if (!bioEditor) {
    bioEditor = initRichTextEditor(
      document.getElementById('bio-editor'),
      document.getElementById('bio-toolbar'),
      { onUploadImage: uploadBioImage }
    );
  }
  bioEditor.setHtml(profileBio || '');
  updateBioPreview(profileBio || '');

  updateNav();
}

function updateBioPreview(html) {
  const wrap = document.getElementById('bio-preview-wrap');
  const preview = document.getElementById('bio-preview');
  const hasContent = html && html.replace(/<[^>]+>/g, '').trim().length > 0;
  wrap.hidden = !hasContent;
  preview.innerHTML = html || '';
}

document.getElementById('avatar-file-input').addEventListener('change', (e) => {
  const file = e.target.files?.[0] || null;
  selectedAvatarFile = file;
  document.getElementById('avatar-file-name').textContent = file ? file.name : '';
  document.getElementById('upload-avatar-btn').disabled = !file;
  document.getElementById('upload-status').hidden = true;
});

document.getElementById('upload-avatar-btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('upload-status');
  statusEl.hidden = true;
  if (!selectedAvatarFile) {
    statusEl.textContent = 'Choose a photo first';
    statusEl.className = 'status error';
    statusEl.hidden = false;
    return;
  }

  try {
    const fd = new FormData();
    fd.append('file', selectedAvatarFile);
    const { user } = await API.request('/api/profile/avatar/upload', {
      method: 'POST',
      body: fd,
    });
    API.setUser(user);
    updateNav();
    selectedAvatarFile = null;
    document.getElementById('avatar-file-input').value = '';
    document.getElementById('avatar-file-name').textContent = '';
    document.getElementById('upload-avatar-btn').disabled = true;
    statusEl.textContent = 'Photo uploaded and set as your avatar';
    statusEl.className = 'status ok';
    statusEl.hidden = false;
    await loadProfile();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
    statusEl.hidden = false;
  }
});

document.getElementById('save-avatar').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="avatar_mode"]:checked')?.value || 'auto';
  const statusEl = document.getElementById('save-status');
  statusEl.hidden = true;

  try {
    const { user } = await API.request('/api/profile/avatar', {
      method: 'PUT',
      body: JSON.stringify({
        avatar_mode: mode,
        avatar_generic_id: selectedGenericId,
      }),
    });

    API.setUser(user);
    updateNav();

    statusEl.textContent = 'Avatar saved';
    statusEl.className = 'status ok';
    statusEl.hidden = false;

    document.getElementById('current-avatar').src = user.avatar_url;
    await loadProfile();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
    statusEl.hidden = false;
  }
});

document.getElementById('save-bio').addEventListener('click', async () => {
  const statusEl = document.getElementById('save-bio-status');
  statusEl.hidden = true;

  try {
    const html = bioEditor?.getHtml() || '';
    const { profile_bio: profileBio } = await API.request('/api/profile/bio', {
      method: 'PUT',
      body: JSON.stringify({ profile_bio: html }),
    });

    statusEl.textContent = 'Bio saved';
    statusEl.className = 'status ok';
    statusEl.hidden = false;
    bioEditor?.setHtml(profileBio || '');
    updateBioPreview(profileBio || '');
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
    statusEl.hidden = false;
  }
});

loadProfile();
