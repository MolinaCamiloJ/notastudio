// i18n.js — Carga de idiomas y utilidades de traducción
const AVAILABLE_LANGS = ['en', 'es', 'pt', 'ar', 'zh', 'ru', 'ja'];
const DEFAULT_LANG = 'en';

let currentLangCode = DEFAULT_LANG;
let currentDict = {};
const dictCache = {};

async function loadLocale(code) {
  if (dictCache[code]) return dictCache[code];
  const resp = await fetch(`locales/${code}.json`);
  const data = await resp.json();
  dictCache[code] = data;
  return data;
}

function t(key, vars) {
  let str = currentDict[key] || key;
  if (vars) {
    for (const k in vars) {
      str = str.replace(`{${k}}`, vars[k]);
    }
  }
  return str;
}

async function setLanguage(code) {
  currentLangCode = AVAILABLE_LANGS.includes(code) ? code : DEFAULT_LANG;
  currentDict = await loadLocale(currentLangCode);
  document.documentElement.lang = currentLangCode;
  document.body.dir = currentDict.dir || 'ltr';
  applyStaticTranslations();
  localStorage.setItem('notastudio_lang', currentLangCode);
}

function applyStaticTranslations() {
  document.getElementById('loginSubtitle').textContent = t('loginSubtitle');
  document.getElementById('btnLogin').textContent = t('loginButton');
  document.getElementById('loginWaiting').textContent = t('loginWaiting');

  document.getElementById('btnUpload').textContent = t('uploadButton');

  document.getElementById('uploadingText').textContent = t('uploading');

  document.getElementById('successTitle').textContent = t('successTitle');
  document.getElementById('btnUploadAnother').textContent = t('uploadAnother');
  document.getElementById('btnExitSuccess').textContent = t('exit');
  document.getElementById('deleteLoginSuccessText').textContent = t('deleteLogin');

  document.getElementById('errorTitle').textContent = t('errorTitle');
  document.getElementById('errorSubtitle').textContent = t('errorSubtitle');
  document.getElementById('btnRetry').textContent = t('retry');
  document.getElementById('btnExitError').textContent = t('exit');
  document.getElementById('deleteLoginErrorText').textContent = t('deleteLogin');

  document.getElementById('modalTitle').textContent = t('modalTitle');
  document.getElementById('modalInput').placeholder = t('modalPlaceholder');
  document.getElementById('modalWarning').textContent = t('modalWarning');
  document.getElementById('modalCancel').textContent = t('modalCancel');
  document.getElementById('modalAccept').textContent = t('modalAccept');

  // Actualizar el texto de bienvenida si ya hay un usuario cargado
  if (window.__notastudio_username) {
    document.getElementById('welcomeText').textContent = t('welcome', { username: window.__notastudio_username });
  }
}

async function initLangSelector() {
  const select = document.getElementById('langSelect');
  select.innerHTML = '';
  for (const code of AVAILABLE_LANGS) {
    const dict = await loadLocale(code);
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = dict.langName;
    select.appendChild(opt);
  }

  const saved = localStorage.getItem('notastudio_lang') || DEFAULT_LANG;
  select.value = saved;
  await setLanguage(saved);

  select.addEventListener('change', () => setLanguage(select.value));
}
