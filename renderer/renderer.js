// renderer.js — Lógica de la interfaz de NotaStudio

const screens = {
  login: document.getElementById('screen-login'),
  main: document.getElementById('screen-main'),
  uploading: document.getElementById('screen-uploading'),
  success: document.getElementById('screen-success'),
  error: document.getElementById('screen-error')
};

let lastFolderPath = null;
let lastRepoName = null;

function showScreen(name) {
  for (const key in screens) screens[key].classList.add('hidden');
  screens[name].classList.remove('hidden');
}

function setWelcomeUser(username) {
  window.__notastudio_username = username;
  document.getElementById('welcomeText').textContent = t('welcome', { username });
}

// ---------- Inicio ----------
async function init() {
  await initLangSelector();

  const session = await window.notastudio.getSession();
  if (session.ok) {
    setWelcomeUser(session.username);
    showScreen('main');
  } else {
    showScreen('login');
  }
}

// ---------- Login ----------
document.getElementById('btnLogin').addEventListener('click', async () => {
  document.getElementById('btnLogin').disabled = true;
  document.getElementById('loginWaiting').classList.remove('hidden');

  const result = await window.notastudio.login();

  document.getElementById('btnLogin').disabled = false;
  document.getElementById('loginWaiting').classList.add('hidden');

  if (result.ok) {
    setWelcomeUser(result.username);
    showScreen('main');
  } else {
    alert(result.error === 'MISSING_CLIENT_ID' ? t('missingClientId') : (result.error || t('errorTitle')));
  }
});

// ---------- Cargar Repositorios ----------
document.getElementById('btnUpload').addEventListener('click', async () => {
  const folder = await window.notastudio.selectFolder();
  if (!folder.ok) return;

  lastFolderPath = folder.folderPath;
  lastRepoName = null;

  document.getElementById('modalInput').value = '';
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('modalInput').focus();

  document.getElementById('modalOverlay').dataset.folderName = folder.folderName;
});

document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.add('hidden');
});

document.getElementById('modalAccept').addEventListener('click', async () => {
  const typed = document.getElementById('modalInput').value.trim();
  const folderName = document.getElementById('modalOverlay').dataset.folderName;
  lastRepoName = typed.length > 0 ? typed : folderName;

  document.getElementById('modalOverlay').classList.add('hidden');
  await startUpload(lastFolderPath, lastRepoName);
});

// ---------- Subida ----------
async function startUpload(folderPath, repoName) {
  showScreen('uploading');
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressPercent').textContent = '0%';

  window.notastudio.onUploadProgress(({ percent }) => {
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressPercent').textContent = percent + '%';
  });

  const result = await window.notastudio.uploadRepo({ folderPath, repoName });

  if (result.ok) {
    showScreen('success');
  } else {
    showScreen('error');
  }
}

document.getElementById('btnRetry').addEventListener('click', () => {
  if (lastFolderPath && lastRepoName) {
    startUpload(lastFolderPath, lastRepoName);
  }
});

// ---------- Botones "Subir otro" / "Salir" ----------
document.getElementById('btnUploadAnother').addEventListener('click', () => {
  showScreen('main');
});

document.getElementById('btnExitSuccess').addEventListener('click', () => window.notastudio.quitApp());
document.getElementById('btnExitError').addEventListener('click', () => window.notastudio.quitApp());

// ---------- Casillas "Eliminar datos de inicio de sesión" ----------
async function handleDeleteLoginCheckbox(checkbox) {
  if (checkbox.checked) {
    await window.notastudio.logout();
  }
}

document.getElementById('chkDeleteLoginSuccess').addEventListener('change', (e) => handleDeleteLoginCheckbox(e.target));
document.getElementById('chkDeleteLoginError').addEventListener('change', (e) => handleDeleteLoginCheckbox(e.target));

init();
