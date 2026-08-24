const extApi = globalThis.browser || globalThis.chrome;
const MDM_API_URL = 'http://127.0.0.1:9666/download';
const MDM_STATUS_URL = 'http://127.0.0.1:9666/status';

function setupContextMenus() {
  extApi.contextMenus.removeAll(() => {
    // 1. Link context menu
    extApi.contextMenus.create({
      id: 'mdm-download-link',
      title: 'Download Link with MDM',
      contexts: ['link']
    });

    // 2. Video / Audio context menu
    extApi.contextMenus.create({
      id: 'mdm-download-media',
      title: 'Download Video/Audio with MDM',
      contexts: ['video', 'audio']
    });

    // 3. Image context menu with format conversion options
    extApi.contextMenus.create({
      id: 'mdm-image-parent',
      title: 'Download Image with MDM',
      contexts: ['image']
    });

    extApi.contextMenus.create({
      id: 'mdm-image-original',
      parentId: 'mdm-image-parent',
      title: 'Original Image Format',
      contexts: ['image']
    });

    extApi.contextMenus.create({
      id: 'mdm-image-png',
      parentId: 'mdm-image-parent',
      title: 'Save as PNG (.png)',
      contexts: ['image']
    });

    extApi.contextMenus.create({
      id: 'mdm-image-jpg',
      parentId: 'mdm-image-parent',
      title: 'Save as JPEG (.jpg)',
      contexts: ['image']
    });

    extApi.contextMenus.create({
      id: 'mdm-image-webp',
      parentId: 'mdm-image-parent',
      title: 'Save as WebP (.webp)',
      contexts: ['image']
    });
  });
}

// Register menus on install & startup
extApi.runtime.onInstalled.addListener(() => {
  setupContextMenus();
  extApi.storage.local.set({ autoIntercept: true });
});
setupContextMenus();

// Handle Context Menu clicks
extApi.contextMenus.onClicked.addListener(async (info, tab) => {
  const referer = tab?.url || info.pageUrl || '';

  if (info.menuItemId.startsWith('mdm-image')) {
    const url = info.srcUrl || info.linkUrl;
    if (!url) return;

    let convertFormat = undefined;
    if (info.menuItemId === 'mdm-image-png') convertFormat = 'png';
    else if (info.menuItemId === 'mdm-image-jpg') convertFormat = 'jpg';
    else if (info.menuItemId === 'mdm-image-webp') convertFormat = 'webp';

    let cleanFilename = '';
    try {
      const pathname = new URL(url).pathname;
      const base = pathname.split('/').pop() || 'image';
      const nameWithoutExt = base.replace(/\.[^/.]+$/, '') || 'image';
      if (convertFormat) {
        cleanFilename = `${nameWithoutExt}.${convertFormat}`;
      } else {
        cleanFilename = base;
      }
    } catch {
      if (convertFormat) cleanFilename = `image.${convertFormat}`;
    }

    await sendToMdm(url, referer, cleanFilename, convertFormat);
    return;
  }

  const url = info.linkUrl || info.srcUrl;
  if (!url) return;
  await sendToMdm(url, referer);
});

// Track recent modifier keys (Shift/Alt)
let lastModifierState = {
  shift: false,
  alt: false,
  timestamp: 0
};

// Intercept browser downloads
extApi.downloads.onCreated.addListener(async (downloadItem) => {
  const { autoIntercept } = await extApi.storage.local.get('autoIntercept');
  
  const now = Date.now();
  const isShiftActive = lastModifierState.shift && (now - lastModifierState.timestamp < 3500);

  // 1. If Auto-Intercept is ON, Shift + Click skips MDM and downloads with native browser!
  if (autoIntercept !== false) {
    if (isShiftActive) {
      console.log('Shift + Click detected: Bypassing MDM to let browser download natively.');
      lastModifierState.shift = false;
      return;
    }
  } else {
    // 2. If Auto-Intercept is OFF, Shift + Click forces MDM download!
    if (!isShiftActive) {
      return; // Skip MDM, download natively
    }
    console.log('Shift + Click detected: Forcing download with MDM while Auto-Intercept is OFF.');
    lastModifierState.shift = false;
  }

  const url = downloadItem.finalUrl || downloadItem.url;
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return;

  // Google Drive on-the-fly folder zipping and Google Takeout dynamic streams are bound to the browser's active socket.
  // Cancelling them terminates Google's live zipping process and invalidates the session token.
  if (
    url.includes('takeout-download-drive.usercontent.google.com') ||
    url.includes('takeout.google.com/takeout/download')
  ) {
    return; // Allow browser to download on-the-fly generated zip files natively without interruption
  }

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

// Handle messages from content scripts (e.g. Video Sniffer & Keyboard Modifiers)
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message.action || message.type;

  if (action === 'KEY_MODIFIER_ACTIVE') {
    lastModifierState = {
      shift: Boolean(message.shift),
      alt: Boolean(message.alt),
      timestamp: message.timestamp || Date.now()
    };
    sendResponse({ success: true });
    return true;
  }

  if (action === 'download_video' || action === 'DOWNLOAD_MEDIA' || action === 'DOWNLOAD_URL') {
    const payload = message.data || message;
    const url = payload.url;
    const filename = payload.filename || '';
    const referer = payload.pageUrl || sender?.tab?.url || '';

    if (!url) {
      sendResponse({ success: false, error: 'No URL provided' });
      return true;
    }

    sendToMdm(url, referer, filename)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

async function getCookiesForDownload(url, referer = '') {
  const cookieMap = new Map();

  const addCookies = (cookies) => {
    if (Array.isArray(cookies)) {
      for (const c of cookies) {
        if (c && c.name && c.value !== undefined) {
          cookieMap.set(c.name, c.value);
        }
      }
    }
  };

  // 1. Get cookies matched by browser for the specific target download URL
  try {
    if (url) {
      const urlCookies = await extApi.cookies.getAll({ url });
      addCookies(urlCookies);
    }
  } catch {}

  // 2. Get cookies matched by browser for the referrer URL (e.g. drive.google.com or takeout.google.com)
  try {
    if (referer) {
      const refCookies = await extApi.cookies.getAll({ url: referer });
      addCookies(refCookies);
    }
  } catch {}

  if (cookieMap.size === 0) return '';
  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function sendToMdm(url, referer = '', filename = '', convertFormat = undefined) {
  try {
    const headers = {};
    if (referer) headers['Referer'] = referer;
    headers['User-Agent'] = navigator.userAgent;

    // Retrieve exact matching cookies for url and referer
    try {
      const cookieStr = await getCookiesForDownload(url, referer);
      if (cookieStr) {
        headers['Cookie'] = cookieStr;
      }
    } catch (e) {
      console.warn('Could not retrieve cookies:', e);
    }

    const response = await fetch(MDM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        filename: filename || undefined,
        headers,
        convertFormat: convertFormat || undefined,
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
