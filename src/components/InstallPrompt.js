import React, { useState, useEffect } from 'react';

const DISMISSED_KEY = 'pwa_install_dismissed';

/** True when running in standalone (already installed) */
const isStandalone = () =>
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

/** True on iPhone / iPad in Safari (not Chrome/Firefox) */
const isIOSSafari = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
  return isIOS && isSafari;
};

/** True on any device that could benefit from install (not desktop Chrome with no prompt) */
const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid,    setShowAndroid]    = useState(false);
  const [showIOS,        setShowIOS]        = useState(false);
  const [showUpdate,     setShowUpdate]     = useState(false);
  const [updateReg,      setUpdateReg]      = useState(null);

  useEffect(() => {
    // ── SW update toast ─────────────────────────────────────────────────────
    const onUpdate = (e) => { setUpdateReg(e.detail); setShowUpdate(true); };
    window.addEventListener('swUpdateReady', onUpdate);

    // ── Install prompts (skip if already installed or dismissed) ────────────
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) {
      return () => window.removeEventListener('swUpdateReady', onUpdate);
    }

    // Android / Chrome: browser fires beforeinstallprompt
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobile()) setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS Safari: no API, show manual instructions
    if (isIOSSafari()) setShowIOS(true);

    return () => {
      window.removeEventListener('swUpdateReady', onUpdate);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, '1');
    setDeferredPrompt(null);
    setShowAndroid(false);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowAndroid(false);
    setShowIOS(false);
  };

  const handleUpdate = () => {
    if (updateReg?.waiting) {
      updateReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdate(false);
  };

  // ── Update toast (top of screen) ───────────────────────────────────────────
  if (showUpdate) {
    return (
      <div className="pwa-update-toast">
        <span className="pwa-update-text">✨ New version available</span>
        <button className="pwa-update-btn" onClick={handleUpdate}>Update Now</button>
        <button className="pwa-dismiss-x" onClick={() => setShowUpdate(false)}>×</button>
      </div>
    );
  }

  // ── Android install banner (bottom of screen) ──────────────────────────────
  if (showAndroid) {
    return (
      <div className="pwa-banner">
        <div className="pwa-banner-icon">
          <img src="/logo.svg" alt="BudgetFlow" width="40" height="40" />
        </div>
        <div className="pwa-banner-text">
          <div className="pwa-banner-title">Add to Home Screen</div>
          <div className="pwa-banner-sub">Install for the best experience</div>
        </div>
        <button className="pwa-install-btn" onClick={handleInstall}>Install</button>
        <button className="pwa-dismiss-x" onClick={dismiss}>×</button>
      </div>
    );
  }

  // ── iOS Safari instructions (bottom sheet) ─────────────────────────────────
  if (showIOS) {
    return (
      <div className="pwa-banner pwa-ios-banner">
        <div className="pwa-banner-icon">
          <img src="/logo.svg" alt="BudgetFlow" width="40" height="40" />
        </div>
        <div className="pwa-banner-text">
          <div className="pwa-banner-title">Install BudgetFlow</div>
          <div className="pwa-banner-sub">
            Tap <strong>Share</strong> <span className="ios-share-icon">⬆</span> then{' '}
            <strong>"Add to Home Screen"</strong>
          </div>
        </div>
        <button className="pwa-dismiss-x" onClick={dismiss}>×</button>
      </div>
    );
  }

  return null;
}
