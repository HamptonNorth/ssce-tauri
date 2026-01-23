/**
 * Settings Dialog
 *
 * Provides a JSON text editor for editing defaults.json configuration.
 * This is intended for initial setup or occasional configuration changes,
 * not everyday use.
 */

import * as tauriBridge from "../../tauri-bridge.js";
import { showToast } from "../../utils/toast.js";
import { showConfirmModal } from "./alert-confirm.js";

// Dialog elements
let dialog = null;
let jsonEditor = null;
let pathDisplay = null;
let errorDisplay = null;
let saveBtn = null;
let cancelBtn = null;
let resetBtn = null;

// Original config for reset
let originalConfig = null;
let bundledConfig = null;

/**
 * Initialize settings dialog event handlers
 */
export function initSettingsDialog() {
  dialog = document.getElementById("dialog-settings");
  jsonEditor = document.getElementById("settings-json-editor");
  pathDisplay = document.getElementById("settings-path");
  errorDisplay = document.getElementById("settings-error");
  saveBtn = document.getElementById("settings-save");
  cancelBtn = document.getElementById("settings-cancel");
  resetBtn = document.getElementById("settings-reset");

  if (!dialog) return;

  // Settings button in toolbar
  const settingsBtn = document.getElementById("btn-settings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", showSettingsDialog);
  }

  // Cancel button
  cancelBtn?.addEventListener("click", () => {
    dialog.close();
  });

  // Save button
  saveBtn?.addEventListener("click", handleSave);

  // Reset button
  resetBtn?.addEventListener("click", handleReset);

  // Validate JSON on input
  jsonEditor?.addEventListener("input", validateJson);

  // Close on backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });

  // Close on Escape
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dialog.close();
    }
  });
}

/**
 * Show the settings dialog
 */
export async function showSettingsDialog() {
  if (!dialog) return;

  // Only available in Tauri
  if (!tauriBridge.isTauri()) {
    showToast("Settings editor is only available in the desktop app", "info");
    return;
  }

  try {
    // Load current config
    const invoke = window.__TAURI__?.core?.invoke;
    if (!invoke) {
      showToast("Tauri API not available", "error");
      return;
    }

    // Get the config path
    const configPath = await invoke("get_user_config_path");
    pathDisplay.textContent = `Save location: ${configPath}`;

    // Load current config
    const configJson = await invoke("get_defaults_config");
    originalConfig = configJson;

    // Pretty print the JSON
    try {
      const parsed = JSON.parse(configJson);
      jsonEditor.value = JSON.stringify(parsed, null, 2);
    } catch {
      jsonEditor.value = configJson;
    }

    // Clear any previous errors
    hideError();

    dialog.showModal();
  } catch (err) {
    console.error("Failed to load settings:", err);
    showToast(`Failed to load settings: ${err.message}`, "error");
  }
}

/**
 * Validate JSON in the editor
 */
function validateJson() {
  const json = jsonEditor.value.trim();

  if (!json) {
    showError("Configuration cannot be empty");
    return false;
  }

  try {
    JSON.parse(json);
    hideError();
    return true;
  } catch (err) {
    showError(`Invalid JSON: ${err.message}`);
    return false;
  }
}

/**
 * Show error message
 */
function showError(message) {
  if (errorDisplay) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove("hidden");
  }
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.classList.add("opacity-50", "cursor-not-allowed");
  }
}

/**
 * Hide error message
 */
function hideError() {
  if (errorDisplay) {
    errorDisplay.classList.add("hidden");
  }
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

/**
 * Handle save button click
 */
async function handleSave() {
  if (!validateJson()) {
    return;
  }

  const json = jsonEditor.value.trim();

  try {
    const invoke = window.__TAURI__?.core?.invoke;
    if (!invoke) {
      showToast("Tauri API not available", "error");
      return;
    }

    // Save the config
    const savedPath = await invoke("save_defaults_config", { data: json });
    showToast(`Settings saved to ${savedPath}`, "success");

    dialog.close();

    // Prompt for restart
    const restart = await showConfirmModal(
      "Restart Required",
      "Settings have been saved. The application needs to restart for changes to take effect.\n\nRestart now?"
    );

    if (restart) {
      // Reload the app
      window.location.reload();
    }
  } catch (err) {
    console.error("Failed to save settings:", err);
    showError(`Failed to save: ${err.message}`);
  }
}

/**
 * Handle reset button click
 */
async function handleReset() {
  const confirmed = await showConfirmModal(
    "Reset to Defaults",
    "This will reset all settings to the bundled defaults. Your custom configuration will be deleted.\n\nContinue?"
  );

  if (!confirmed) return;

  try {
    const invoke = window.__TAURI__?.core?.invoke;
    if (!invoke) {
      showToast("Tauri API not available", "error");
      return;
    }

    // Get the user config path and delete it
    const configPath = await invoke("get_user_config_path");

    // Try to delete the user config file
    try {
      await invoke("delete_autosave", { path: configPath });
    } catch {
      // File might not exist, that's OK
    }

    showToast("Settings reset to defaults", "success");
    dialog.close();

    // Prompt for restart
    const restart = await showConfirmModal(
      "Restart Required",
      "Settings have been reset. The application needs to restart for changes to take effect.\n\nRestart now?"
    );

    if (restart) {
      window.location.reload();
    }
  } catch (err) {
    console.error("Failed to reset settings:", err);
    showToast(`Failed to reset: ${err.message}`, "error");
  }
}
