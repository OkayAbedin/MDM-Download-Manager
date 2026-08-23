const extApi = globalThis.browser || globalThis.chrome;
const MDM_API_URL = 'http://127.0.0.1:9666/download';
const MDM_STATUS_URL = 'http://127.0.0.1:9666/status';

// Register Context Menus
extApi.runtime.onInstalled.addListener(() => {
  extApi.contextMenus.create({
    id: 'mdm-download-link',
    title: 'Download with MDM',
    contexts: ['link']
  });

  extApi.contextMenus.create({
    id: 'mdm-download-media',
    title: 'Download Media with MDM',
    contexts: ['video', 'audio', 'image']
  });

  extApi.storage.local.set({ autoIntercept: true });
});

// Handle Context Menu clicks
extApi.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.srcUrl;
  if (!url) return;

  const referer = tab?.url || '';
  await sendToMdm(url, referer);
});

// Intercept browser downloads
extApi.downloads.onCreated.addListener(async (downloadItem) => {
  const { autoIntercept } = await extApi.storage.local.get('autoIntercept');
  if (autoIntercept === false) return;

  const url = downloadItem.finalUrl || downloadItem.url;
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return;

  // Cancel the native browser download
  try {
    if (extApi.downloads.cancel) {
      await extApi.downloads.cancel(downloadItem.id);
    }
    if (extApi.downloads.erase) {
      await extApi.downloads.erase({ id: downloadItem.id });
    }
  } catch (e) {
    console.warn('Error cancelling browser download:', e);
  }

  // Extract basename only (strip any local C:\Users\... paths provided by browser API)
  let cleanFilename = '';
  if (downloadItem.filename) {
    cleanFilename = downloadItem.filename.split(/[\\/]/).pop() || '';
  }

  // Forward to MDM desktop app
  await sendToMdm(url, downloadItem.referrer || '', cleanFilename);
});

// Handle messages from content scripts (e.g. Video Sniffer)
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message.action || message.type;
  if (action === 'download_video' || action === 'DOWNLOAD_MEDIA' || action === 'DOWNLOAD_URL') {
    const payload = message.data || message;
    const url = payload.url;
    const filename = payload.filename || '';
    const referer = payload.pageUrl || sender?.tab?.url || '';

    if (!url) {
      sendResponse({ success: false, error: 'No URL provided' });
      return;
    }

    sendToMdm(url, referer, filename)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

async function sendToMdm(url, referer = '', filename = '') {
  try {
    const headers = {};
    if (referer) headers['Referer'] = referer;
    headers['User-Agent'] = navigator.userAgent;

    // Retrieve cookies for domain if available
    try {
      const parsed = new URL(url);
      const cookies = await extApi.cookies.getAll({ domain: parsed.hostname });
      if (cookies && cookies.length > 0) {
        headers['Cookie'] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
    } catch {}

    const response = await fetch(MDM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        filename: filename || undefined,
        headers,
        autoStart: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorText = await response.text();
      throw new Error(`MDM HTTP ${response.status}: ${errorText}`);
    }
  } catch (err) {
    console.error('Failed to send download to MDM Desktop App:', err);
    return { success: false, error: err.message };
  }
}
