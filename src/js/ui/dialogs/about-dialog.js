/**
 * About SSCE Desktop Dialog
 *
 * Shows system information useful for support:
 * - App version and build date
 * - Platform, OS, monitor size
 * - WebView info, config paths
 */

import { getEnvConfig } from "../../utils/config.js";

let dialog = null;

/**
 * Initialize the about dialog
 */
export function initAboutDialog() {
  dialog = document.getElementById("dialog-about");
  if (!dialog) return;

  // Close button
  const closeBtn = dialog.querySelector("[data-action='close']");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => dialog.close());
  }

  // Copy button
  const copyBtn = dialog.querySelector("[data-action='copy']");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyInfoToClipboard);
  }

  // ESC to close
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dialog.close();
    }
  });
}

/**
 * Show the about dialog, gathering system info from Rust
 */
export async function showAboutDialog() {
  if (!dialog) return;

  const contentEl = dialog.querySelector("#about-content");
  if (!contentEl) return;

  // Show loading state
  contentEl.textContent = "Loading system info...";
  dialog.showModal();

  try {
    const info = await gatherSystemInfo();
    renderInfo(contentEl, info);
  } catch (err) {
    contentEl.textContent = `Failed to load system info: ${err.message || err}`;
  }
}

/**
 * Gather all system information
 */
async function gatherSystemInfo() {
  const info = {};

  // Get info from Rust command
  if (window.__TAURI__?.core) {
    try {
      const rustInfo = await window.__TAURI__.core.invoke("get_system_info");
      Object.assign(info, rustInfo);
    } catch (e) {
      console.error("Failed to get system info from Rust:", e);
    }
  }

  // Build date from env config
  const envConfig = getEnvConfig();
  if (envConfig?.build_timestamp) {
    info.buildDate = envConfig.build_timestamp;
  }

  // Browser/WebView info from JS
  info.userAgent = navigator.userAgent;
  info.screenWidth = window.screen.width;
  info.screenHeight = window.screen.height;
  info.devicePixelRatio = window.devicePixelRatio;

  // Extract WebView version from user agent
  const webkitMatch = navigator.userAgent.match(/AppleWebKit\/([\d.]+)/);
  if (webkitMatch) {
    info.webViewVersion = `WebKit ${webkitMatch[1]}`;
  }

  return info;
}

/**
 * Render info into the dialog content element
 */
function renderInfo(el, info) {
  const lines = [];

  lines.push(`SSCE Desktop v${info.appVersion || "unknown"}`);
  if (info.buildDate) {
    lines.push(`Built: ${info.buildDate}`);
  }
  lines.push("");

  lines.push("--- System ---");
  lines.push(`Platform:  ${info.platform || "unknown"} ${info.arch || ""}`);
  if (info.osVersion) {
    lines.push(`OS:        ${info.osVersion}`);
  }
  if (info.kernelVersion) {
    lines.push(`Kernel:    ${info.kernelVersion}`);
  }
  lines.push(`Monitor:   ${info.monitorWidth || info.screenWidth} x ${info.monitorHeight || info.screenHeight}`);
  if (info.scaleFactor && info.scaleFactor !== "1.00") {
    lines.push(`Scale:     ${info.scaleFactor}x`);
  }
  if (info.webViewVersion) {
    lines.push(`WebView:   ${info.webViewVersion}`);
  }
  lines.push("");

  lines.push("--- Paths ---");
  if (info.configPath) {
    lines.push(`Config:    ${info.configPath}`);
  }
  lines.push(`Temp:      ~/.ssce-temp/`);

  el.textContent = lines.join("\n");
}

/**
 * Copy all info to clipboard as plain text
 */
async function copyInfoToClipboard() {
  const contentEl = dialog.querySelector("#about-content");
  if (!contentEl) return;

  try {
    await navigator.clipboard.writeText(contentEl.textContent);

    // Visual feedback
    const copyBtn = dialog.querySelector("[data-action='copy']");
    if (copyBtn) {
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = original; }, 1500);
    }
  } catch (e) {
    console.error("Failed to copy:", e);
  }
}
