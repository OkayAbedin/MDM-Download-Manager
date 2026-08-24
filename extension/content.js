// MDM Video Grabber Overlay
(function () {
  const extApi = globalThis.browser || globalThis.chrome;

  async function injectVideoGrabber(video) {
    if (video.dataset.mdmInjected) return;

    try {
      const storage = await extApi.storage.local.get('enableVideoGrabber');
      if (storage.enableVideoGrabber === false) return;
    } catch {}

    video.dataset.mdmInjected = 'true';

    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(18, 18, 18, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(132, 206, 25, 0.4);
      border-radius: 6px;
      padding: 5px 8px 5px 10px;
      color: #ededed;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      transition: opacity 0.4s ease, transform 0.2s ease, border-color 0.2s ease;
      opacity: 1;
      user-select: none;
    `;

    function renderDefault() {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; cursor: pointer;" id="mdm-dl-btn">
          <div style="width: 14px; height: 14px; border-radius: 3px; background: #84ce19; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg viewBox="0 0 322.95 322.95" width="10" height="10">
              <path fill="#ffffff" d="M156.33,173.36h0c-7.08,0-12.81-5.74-12.81-12.81v-69.14c0-11.46-13.9-17.16-21.94-8.99l-68.04,69.14c-7.97,8.1-2.23,21.8,9.13,21.8h41.67c7.08,0,12.81,5.74,12.81,12.81v69.14c0,11.46,13.9,17.16,21.94,8.99l85.73-87.12c2.41-2.45,5.7-3.83,9.13-3.83h26.37c7.08,0,12.81-5.74,12.81-12.81v-69.14c0-11.46-13.9-17.16-21.94-8.99l-85.73,87.12c-2.41,2.45-5.7,3.83-9.13,3.83Z" />
            </svg>
          </div>
          <span style="letter-spacing: -0.01em;">Download with MDM</span>
        </div>
        <div style="width: 1px; height: 12px; background: rgba(255,255,255,0.15); margin: 0 2px;"></div>
        <div style="cursor: pointer; opacity: 0.6; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 3px; transition: opacity 0.2s;" id="mdm-close-btn" title="Dismiss">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      `;

      const dlBtn = container.querySelector('#mdm-dl-btn');
      const closeBtn = container.querySelector('#mdm-close-btn');

      if (closeBtn) {
        closeBtn.onmouseenter = () => { closeBtn.style.opacity = '1'; closeBtn.style.background = 'rgba(255,255,255,0.15)'; };
        closeBtn.onmouseleave = () => { closeBtn.style.opacity = '0.6'; closeBtn.style.background = 'transparent'; };
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          container.style.display = 'none';
        };
      }

      if (dlBtn) {
        dlBtn.onclick = handleDownload;
      }
    }

    // Auto-fade timer management (Low opacity after 2s of inactivity)
    let fadeTimer = null;
    let isHovered = false;

    function scheduleFade() {
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        if (!isHovered) {
          container.style.opacity = '0.3';
          container.style.transform = 'scale(0.96)';
        }
      }, 2000);
    }

    container.onmouseenter = () => {
      isHovered = true;
      if (fadeTimer) clearTimeout(fadeTimer);
      container.style.opacity = '1';
      container.style.borderColor = 'rgba(132, 206, 25, 0.8)';
      container.style.transform = 'scale(1.02)';
    };

    container.onmouseleave = () => {
      isHovered = false;
      container.style.borderColor = 'rgba(132, 206, 25, 0.4)';
      container.style.transform = 'scale(1)';
      scheduleFade();
    };

    function handleDownload(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      let targetUrl = window.location.href;
      const videoSrc = video.currentSrc || video.src;

      // If it is a direct file link (not blob and not YouTube), use direct videoSrc
      if (videoSrc && !videoSrc.startsWith('blob:') && !window.location.hostname.includes('youtube.com')) {
        targetUrl = videoSrc;
      }

      const rawTitle = document.title ? document.title.replace(/[\\/:*?"<>|]/g, '_').trim() : 'video';
      const cleanTitle = `${rawTitle.replace(/ - YouTube$/i, '')}.mp4`;

      // Show sending state
      container.innerHTML = `
        <span style="color: #84ce19;">Sending to MDM...</span>
      `;

      extApi.runtime.sendMessage({
        action: 'DOWNLOAD_MEDIA',
        url: targetUrl,
        filename: cleanTitle,
        pageUrl: window.location.href,
      }, (res) => {
        if (res && res.success) {
          container.innerHTML = `
            <div style="width: 14px; height: 14px; border-radius: 3px; background: #84ce19; display: flex; align-items: center; justify-content: center;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span style="color: #84ce19;">Sent to MDM!</span>
          `;
        } else {
          container.innerHTML = `
            <span style="color: #f43f5e;">MDM App is Offline</span>
          `;
        }

        setTimeout(() => {
          renderDefault();
          scheduleFade();
        }, 2500);
      });
    }

    renderDefault();
    scheduleFade(); // Start 2s countdown on appearance

    const parent = video.parentElement || document.body;
    const computedPosition = window.getComputedStyle(parent).position;
    if (computedPosition === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(container);
  }

  function scanVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(injectVideoGrabber);
  }

  // Initial scan & MutationObserver for dynamically loaded video players
  scanVideos();
  const observer = new MutationObserver(scanVideos);
  observer.observe(document.body, { childList: true, subtree: true });

  // ── KEYBOARD SHORTCUTS & CLICK MODIFIERS ─────────────────────────
  let toastEl = null;
  let toastTimer = null;

  function showMdmToast(text, isSuccess = true) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(18, 18, 18, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(132, 206, 25, 0.4);
        border-radius: 8px;
        padding: 8px 14px;
        color: #ededed;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        transition: opacity 0.25s ease, transform 0.25s ease;
        opacity: 0;
        transform: translateY(8px);
        pointer-events: none;
        user-select: none;
      `;
      document.body.appendChild(toastEl);
    }

    toastEl.innerHTML = `
      <div style="width: 16px; height: 16px; border-radius: 4px; background: ${isSuccess ? '#84ce19' : '#38bdf8'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${isSuccess ? '#000' : '#fff'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>${text}</span>
    `;

    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateY(0)';

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(8px)';
      }
    }, 2200);
  }

  // Intercept click events with Shift or Alt modifiers
  window.addEventListener('click', (e) => {
    // Notify background script about active modifier state for upcoming downloads
    if (e.shiftKey || e.altKey) {
      try {
        extApi.runtime.sendMessage({
          action: 'KEY_MODIFIER_ACTIVE',
          shift: e.shiftKey,
          alt: e.altKey,
          timestamp: Date.now()
        });
      } catch {}
    }

    // 1. Alt + Click: Instant Force Download with MDM
    if (e.altKey && !e.shiftKey && !e.ctrlKey) {
      const link = e.target.closest('a');
      const img = e.target.closest('img');
      const videoEl = e.target.closest('video');

      let targetUrl = '';
      let targetName = '';

      if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
        targetUrl = link.href;
        targetName = link.download || link.textContent?.trim().slice(0, 40) || '';
      } else if (img && (img.currentSrc || img.src)) {
        targetUrl = img.currentSrc || img.src;
      } else if (videoEl && (videoEl.currentSrc || videoEl.src)) {
        targetUrl = videoEl.currentSrc || videoEl.src;
      }

      if (targetUrl && !targetUrl.startsWith('blob:') && !targetUrl.startsWith('data:')) {
        e.preventDefault();
        e.stopPropagation();
        showMdmToast('Alt + Click: Sending to MDM...', true);

        extApi.runtime.sendMessage({
          action: 'DOWNLOAD_URL',
          url: targetUrl,
          filename: targetName || undefined,
          pageUrl: window.location.href
        }, (res) => {
          if (res && res.success) {
            showMdmToast('Sent to MDM Download Manager!', true);
          }
        });
      }
    }

    // 2. Shift + Click: Inform user of MDM interception bypass / force
    if (e.shiftKey && !e.altKey) {
      const link = e.target.closest('a');
      if (link && link.href) {
        showMdmToast('Shift + Click: Bypassing / Toggling MDM...', false);
      }
    }
  }, true);
})();
