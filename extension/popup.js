const extApi = globalThis.browser || globalThis.chrome;
const MDM_STATUS_URL = 'http://127.0.0.1:9666/status';

document.addEventListener('DOMContentLoaded', async () => {
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const interceptToggle = document.getElementById('interceptToggle');
  const videoGrabberToggle = document.getElementById('videoGrabberToggle');

  // Load toggle states
  const storage = await extApi.storage.local.get(['autoIntercept', 'enableVideoGrabber']);
  interceptToggle.checked = storage.autoIntercept !== false;
  videoGrabberToggle.checked = storage.enableVideoGrabber !== false;

  interceptToggle.addEventListener('change', () => {
    extApi.storage.local.set({ autoIntercept: interceptToggle.checked });
  });

  videoGrabberToggle.addEventListener('change', () => {
    extApi.storage.local.set({ enableVideoGrabber: videoGrabberToggle.checked });
  });

  // Check connection to MDM Desktop App
  try {
    const res = await fetch(MDM_STATUS_URL, { cache: 'no-store' });
    if (res.ok) {
      statusText.textContent = 'ONLINE';
      badge.className = 'status-badge status-connected';
    } else {
      throw new Error();
    }
  } catch {
    statusText.textContent = 'OFFLINE';
    badge.className = 'status-badge status-disconnected';
  }
});
