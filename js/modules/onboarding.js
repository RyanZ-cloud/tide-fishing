import { readJson, writeJson } from '../utils/storage.js';

const STORAGE_KEY = 'tideHelperOnboardingV1';

export function initOnboarding() {
  const dialog = document.getElementById('onboardingDialog');
  const close = document.getElementById('closeOnboarding');
  if (!dialog || !close || readJson(STORAGE_KEY, false)) return;
  const dismiss = () => {
    writeJson(STORAGE_KEY, true);
    dialog.close();
  };
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', dismiss);
  dialog.showModal();
}
