/**
 * Bulk Export / Backup Dialog
 *
 * Allows exporting multiple .ssce files to PNG/JPEG images,
 * with date filtering, ZIP archive support, and progress tracking.
 */

import * as bridge from "../../tauri-bridge.js";
import { CanvasManager } from "../../canvas.js";
import { LayerManager } from "../../layers.js";
import { deserialize } from "../../utils/ssce-format.js";
import { parseDateFromFilename, groupByMonth, filterByMonth, filterByDateRange, filterBySelectedMonths, suggestZipFilename, getCurrentMonth, getLastMonth } from "../../utils/bulk-export.js";
import { getDefaults } from "../../utils/config.js";
import { showAlertModal } from "./alert-confirm.js";

// Module state
let allFiles = [];
let filteredFiles = [];
let monthlySummary = [];
let isExporting = false;

/**
 * Initialize bulk export dialog event listeners
 */
export function initBulkExportDialog() {
  const dialog = document.getElementById("dialog-bulk-export");
  if (!dialog) return;

  // Cancel button
  document.getElementById("bulk-export-cancel").addEventListener("click", () => {
    if (isExporting) {
      isExporting = false; // Signal cancel
    } else {
      dialog.close();
    }
  });

  // Mode toggle (export vs backup)
  document.querySelectorAll('input[name="bulkMode"]').forEach((radio) => {
    radio.addEventListener("change", handleModeChange);
  });

  // Browse source folder
  document.getElementById("bulk-export-browse").addEventListener("click", handleBrowseSource);

  // Date filter radio changes
  document.querySelectorAll('input[name="bulkDateFilter"]').forEach((radio) => {
    radio.addEventListener("change", handleDateFilterChange);
  });

  // Date range inputs
  document.getElementById("bulk-export-date-start").addEventListener("change", handleDateFilterChange);
  document.getElementById("bulk-export-end").addEventListener("change", handleDateFilterChange);

  // Output type toggle (zip vs folder)
  document.querySelectorAll('input[name="bulkOutput"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isZip = document.querySelector('input[name="bulkOutput"]:checked').value === "zip";
      document.getElementById("bulk-export-zip-options").classList.toggle("hidden", !isZip);
      document.getElementById("bulk-export-folder-options").classList.toggle("hidden", isZip);
    });
  });

  // Update output path when zip name is manually edited
  document.getElementById("bulk-export-zip-name").addEventListener("input", updateZipOutputPath);

  // Browse buttons for ZIP save location and output folder
  document.getElementById("bulk-export-zip-browse").addEventListener("click", async () => {
    const path = await bridge.showSaveDialog({
      title: "Save ZIP Archive",
      defaultName: document.getElementById("bulk-export-zip-name").value,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (path) {
      document.getElementById("bulk-export-zip-name").value = path;
      updateZipOutputPath();
    }
  });

  document.getElementById("bulk-export-output-browse").addEventListener("click", async () => {
    const path = await bridge.showFolderDialog({ title: "Select Output Folder" });
    if (path) document.getElementById("bulk-export-output-folder").value = path;
  });

  // Export button
  document.getElementById("bulk-export-btn").addEventListener("click", handleExport);

  // ESC to cancel
  dialog.addEventListener("cancel", () => {
    isExporting = false;
  });
}

/**
 * Show the bulk export dialog
 */
export function showBulkExportDialog() {
  const dialog = document.getElementById("dialog-bulk-export");
  if (!dialog) return;

  // Reset state
  allFiles = [];
  filteredFiles = [];
  isExporting = false;

  // Pre-fill source from library path config
  const defaults = getDefaults();
  const libraryPath = defaults?.paths?.library || "";
  document.getElementById("bulk-export-source").value = libraryPath;

  // Reset UI
  document.getElementById("bulk-export-file-count").textContent = "";
  document.getElementById("bulk-export-filtered-count").textContent = "";
  document.querySelector('input[name="bulkDateFilter"][value="all"]').checked = true;
  document.getElementById("bulk-export-range-inputs").classList.add("hidden");
  document.getElementById("bulk-export-month-selector").classList.add("hidden");
  document.getElementById("bulk-export-month-selector").innerHTML = "";
  document.getElementById("bulk-export-progress-section").classList.add("hidden");
  document.getElementById("bulk-export-progress-bar").style.width = "0%";
  document.getElementById("bulk-export-zip-name").value = "";
  document.getElementById("bulk-export-zip-output-path").textContent = "";

  // Show ZIP options by default
  document.getElementById("bulk-export-zip-options").classList.remove("hidden");
  document.getElementById("bulk-export-folder-options").classList.add("hidden");

  dialog.showModal();

  // Auto-scan if library path is set
  if (libraryPath) {
    scanSourceFolder(libraryPath);
  }
}

/**
 * Get the current mode: "export" or "backup"
 */
function getMode() {
  return document.querySelector('input[name="bulkMode"]:checked')?.value || "export";
}

/**
 * Handle mode toggle between export and backup
 */
function handleModeChange() {
  const mode = getMode();
  const isBackup = mode === "backup";

  // Hide image-specific options in backup mode
  document.getElementById("bulk-export-image-options").classList.toggle("hidden", isBackup);

  // In backup mode, always show ZIP options and hide folder options
  if (isBackup) {
    document.getElementById("bulk-export-zip-options").classList.remove("hidden");
    document.getElementById("bulk-export-folder-options").classList.add("hidden");
  } else {
    // Restore based on output type radio
    const isZip = document.querySelector('input[name="bulkOutput"]:checked')?.value === "zip";
    document.getElementById("bulk-export-zip-options").classList.toggle("hidden", !isZip);
    document.getElementById("bulk-export-folder-options").classList.toggle("hidden", isZip);
  }

  // Update button text
  const count = filteredFiles.length;
  const label = isBackup ? "Backup" : "Export";
  document.getElementById("bulk-export-btn").textContent = `${label} ${count} file${count !== 1 ? "s" : ""}`;

  updateZipOutputPath();
}

/**
 * Handle browse source folder button
 */
async function handleBrowseSource() {
  const path = await bridge.showFolderDialog({ title: "Select Source Folder" });
  if (!path) return;

  document.getElementById("bulk-export-source").value = path;
  await scanSourceFolder(path);
}

/**
 * Scan source folder and populate file list
 */
async function scanSourceFolder(directory) {
  try {
    allFiles = await bridge.listSsceFiles(directory);
    monthlySummary = await bridge.getMonthlySummary(directory);

    document.getElementById("bulk-export-file-count").textContent = `Found: ${allFiles.length} .ssce file${allFiles.length !== 1 ? "s" : ""}`;

    // Update month counts in filter labels
    const thisMonth = getCurrentMonth();
    const lastMonth = getLastMonth();
    const thisMonthFiles = filterByMonth(allFiles, thisMonth);
    const lastMonthFiles = filterByMonth(allFiles, lastMonth);

    document.getElementById("bulk-export-this-month-count").textContent = thisMonthFiles.length ? `(${thisMonthFiles.length})` : "";
    document.getElementById("bulk-export-last-month-count").textContent = lastMonthFiles.length ? `(${lastMonthFiles.length})` : "";

    // Build month selector checkboxes
    const monthSelector = document.getElementById("bulk-export-month-selector");
    monthSelector.innerHTML = monthlySummary.map((s) => `<label class="flex items-center gap-1"><input type="checkbox" class="bulk-month-cb text-blue-500" value="${s.month}" />${s.month} (${s.count})</label>`).join("");

    // Add change listeners to month checkboxes
    monthSelector.querySelectorAll(".bulk-month-cb").forEach((cb) => {
      cb.addEventListener("change", handleDateFilterChange);
    });

    // Apply current filter
    handleDateFilterChange();
  } catch (error) {
    document.getElementById("bulk-export-file-count").textContent = `Error: ${error}`;
    allFiles = [];
    filteredFiles = [];
  }
}

/**
 * Handle date filter radio/input changes
 */
function handleDateFilterChange() {
  const filterType = document.querySelector('input[name="bulkDateFilter"]:checked').value;

  // Show/hide range inputs and month selector
  document.getElementById("bulk-export-range-inputs").classList.toggle("hidden", filterType !== "range");
  document.getElementById("bulk-export-month-selector").classList.toggle("hidden", filterType !== "selected");

  // Apply filter
  switch (filterType) {
    case "all":
      filteredFiles = [...allFiles];
      break;
    case "thisMonth":
      filteredFiles = filterByMonth(allFiles, getCurrentMonth());
      break;
    case "lastMonth":
      filteredFiles = filterByMonth(allFiles, getLastMonth());
      break;
    case "range": {
      const start = document.getElementById("bulk-export-date-start").value;
      const end = document.getElementById("bulk-export-end").value;
      if (start && end) {
        filteredFiles = filterByDateRange(allFiles, start, end);
      } else {
        filteredFiles = [...allFiles];
      }
      break;
    }
    case "selected": {
      const checked = Array.from(document.querySelectorAll(".bulk-month-cb:checked")).map((cb) => cb.value);
      if (checked.length > 0) {
        filteredFiles = filterBySelectedMonths(allFiles, checked);
      } else {
        filteredFiles = [...allFiles];
      }
      break;
    }
  }

  // Update count display
  const total = allFiles.length;
  const filtered = filteredFiles.length;
  document.getElementById("bulk-export-filtered-count").textContent = filterType === "all" ? "" : `${filtered} of ${total} files selected`;

  // Update export button text
  const label = getMode() === "backup" ? "Backup" : "Export";
  document.getElementById("bulk-export-btn").textContent = `${label} ${filtered} file${filtered !== 1 ? "s" : ""}`;

  // Update suggested ZIP filename
  updateZipFilename(filterType);
}

/**
 * Update suggested ZIP filename based on filter
 */
function updateZipFilename(filterType) {
  const zipNameInput = document.getElementById("bulk-export-zip-name");
  // Only auto-update if not a full path (user hasn't browsed)
  if (zipNameInput.value.includes("/") || zipNameInput.value.includes("\\")) return;

  let suggestion;
  switch (filterType) {
    case "thisMonth":
      suggestion = suggestZipFilename({ type: "month", month: getCurrentMonth() });
      break;
    case "lastMonth":
      suggestion = suggestZipFilename({ type: "month", month: getLastMonth() });
      break;
    case "range": {
      const start = document.getElementById("bulk-export-date-start").value;
      const end = document.getElementById("bulk-export-end").value;
      suggestion = suggestZipFilename({ type: "range", startDate: start, endDate: end });
      break;
    }
    case "selected": {
      const months = Array.from(document.querySelectorAll(".bulk-month-cb:checked")).map((cb) => cb.value);
      suggestion = suggestZipFilename({ type: "selected", months });
      break;
    }
    default:
      suggestion = suggestZipFilename({ type: "all" });
  }
  zipNameInput.value = suggestion;
  updateZipOutputPath();
}

/**
 * Update the displayed output path for the ZIP file
 */
function updateZipOutputPath() {
  const zipName = document.getElementById("bulk-export-zip-name").value;
  const sourceDir = document.getElementById("bulk-export-source").value;
  const pathEl = document.getElementById("bulk-export-zip-output-path");

  if (!zipName) {
    pathEl.textContent = "";
    return;
  }

  if (zipName.includes("/") || zipName.includes("\\")) {
    // Full path already specified via Browse
    pathEl.textContent = `Output: ${zipName}`;
  } else if (sourceDir) {
    pathEl.textContent = `Output: ${sourceDir}/${zipName}`;
  } else {
    pathEl.textContent = "Output: select a source folder first";
  }
}

/**
 * Handle export button click
 */
async function handleExport() {
  const mode = getMode();

  if (filteredFiles.length === 0) {
    await showAlertModal("No Files", "No files to export. Select a source folder with .ssce files.", "warning");
    return;
  }

  if (mode === "backup") {
    return handleBackup();
  }

  const outputType = document.querySelector('input[name="bulkOutput"]:checked').value;
  const format = document.querySelector('input[name="bulkFormat"]:checked').value;
  const includeSnapshots = document.getElementById("bulk-export-snapshots").checked;
  const organizeByMonth = document.getElementById("bulk-export-organize").checked;

  // Determine output path
  let outputPath;
  if (outputType === "zip") {
    outputPath = document.getElementById("bulk-export-zip-name").value;
    if (!outputPath) {
      await showAlertModal("Missing Path", "Enter a ZIP filename.", "warning");
      return;
    }
    // If just a filename (no path), put it in the source directory
    if (!outputPath.includes("/") && !outputPath.includes("\\")) {
      const sourceDir = document.getElementById("bulk-export-source").value;
      outputPath = `${sourceDir}/${outputPath}`;
    }
  } else {
    outputPath = document.getElementById("bulk-export-output-folder").value;
    if (!outputPath) {
      await showAlertModal("Missing Path", "Select an output folder.", "warning");
      return;
    }
  }

  // Start export
  isExporting = true;
  const progressSection = document.getElementById("bulk-export-progress-section");
  const progressBar = document.getElementById("bulk-export-progress-bar");
  const progressText = document.getElementById("bulk-export-progress-text");
  const exportBtn = document.getElementById("bulk-export-btn");

  progressSection.classList.remove("hidden");
  exportBtn.disabled = true;
  exportBtn.textContent = "Exporting...";

  let zipId = null;
  let successCount = 0;
  const errors = [];

  try {
    if (outputType === "zip") {
      zipId = await bridge.zipCreate(outputPath);
    }

    for (let i = 0; i < filteredFiles.length; i++) {
      if (!isExporting) break; // Cancelled

      const file = filteredFiles[i];
      const progress = ((i + 1) / filteredFiles.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Exporting ${i + 1} of ${filteredFiles.length}: ${file.name}`;

      try {
        await exportSingleFile(file, {
          outputType,
          outputPath,
          format,
          includeSnapshots,
          organizeByMonth,
          zipId,
        });
        successCount++;
      } catch (err) {
        errors.push({ file: file.name, error: err.message || String(err) });
      }
    }

    if (zipId && isExporting) {
      await bridge.zipFinalize(zipId);
      zipId = null;
    }
  } catch (err) {
    errors.push({ file: "ZIP", error: err.message || String(err) });
  }

  // Cleanup if cancelled with open zip
  if (zipId) {
    try {
      await bridge.zipFinalize(zipId);
    } catch {
      // Ignore cleanup errors
    }
  }

  // Show results
  isExporting = false;
  exportBtn.disabled = false;
  exportBtn.textContent = `Export ${filteredFiles.length} files`;
  progressSection.classList.add("hidden");

  if (errors.length > 0) {
    const errorList = errors
      .slice(0, 5)
      .map((e) => `${e.file}: ${e.error}`)
      .join("\n");
    const more = errors.length > 5 ? `\n...and ${errors.length - 5} more` : "";
    await showAlertModal("Export Complete", `Exported ${successCount} files. ${errors.length} failed:\n${errorList}${more}`, errors.length === filteredFiles.length ? "error" : "warning");
  } else if (successCount > 0) {
    await showAlertModal("Export Complete", `Successfully exported ${successCount} files.`, "info");
    document.getElementById("dialog-bulk-export").close();
  }
}

/**
 * Handle backup mode — bundle raw .ssce files into a ZIP
 */
async function handleBackup() {
  let outputPath = document.getElementById("bulk-export-zip-name").value;
  if (!outputPath) {
    await showAlertModal("Missing Path", "Enter a ZIP filename.", "warning");
    return;
  }
  // If just a filename (no path), put it in the source directory
  if (!outputPath.includes("/") && !outputPath.includes("\\")) {
    const sourceDir = document.getElementById("bulk-export-source").value;
    outputPath = `${sourceDir}/${outputPath}`;
  }

  const organizeByMonth = document.getElementById("bulk-export-organize").checked;

  isExporting = true;
  const progressSection = document.getElementById("bulk-export-progress-section");
  const progressBar = document.getElementById("bulk-export-progress-bar");
  const progressText = document.getElementById("bulk-export-progress-text");
  const exportBtn = document.getElementById("bulk-export-btn");

  progressSection.classList.remove("hidden");
  exportBtn.disabled = true;
  exportBtn.textContent = "Backing up...";

  let zipId = null;
  let successCount = 0;
  const errors = [];

  try {
    zipId = await bridge.zipCreate(outputPath);

    for (let i = 0; i < filteredFiles.length; i++) {
      if (!isExporting) break;

      const file = filteredFiles[i];
      const progress = ((i + 1) / filteredFiles.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Backing up ${i + 1} of ${filteredFiles.length}: ${file.name}`;

      try {
        const monthFolder = organizeByMonth && file.date ? file.date.substring(0, 7) : "";
        const entryName = monthFolder ? `${monthFolder}/${file.name}` : file.name;
        await bridge.zipAddPath(zipId, entryName, file.path);
        successCount++;
      } catch (err) {
        errors.push({ file: file.name, error: err.message || String(err) });
      }
    }

    if (isExporting) {
      await bridge.zipFinalize(zipId);
      zipId = null;
    }
  } catch (err) {
    errors.push({ file: "ZIP", error: err.message || String(err) });
  }

  if (zipId) {
    try {
      await bridge.zipFinalize(zipId);
    } catch {
      /* ignore */
    }
  }

  isExporting = false;
  exportBtn.disabled = false;
  const count = filteredFiles.length;
  exportBtn.textContent = `Backup ${count} file${count !== 1 ? "s" : ""}`;
  progressSection.classList.add("hidden");

  if (errors.length > 0) {
    const errorList = errors
      .slice(0, 5)
      .map((e) => `${e.file}: ${e.error}`)
      .join("\n");
    const more = errors.length > 5 ? `\n...and ${errors.length - 5} more` : "";
    await showAlertModal("Backup Complete", `Backed up ${successCount} files. ${errors.length} failed:\n${errorList}${more}`, errors.length === filteredFiles.length ? "error" : "warning");
  } else if (successCount > 0) {
    await showAlertModal("Backup Complete", `Successfully backed up ${successCount} .ssce files to:\n${outputPath}`, "info");
    document.getElementById("dialog-bulk-export").close();
  }
}

/**
 * Export a single .ssce file to image
 */
async function exportSingleFile(file, options) {
  const { outputType, outputPath, format, includeSnapshots, organizeByMonth, zipId } = options;

  // Load and deserialize the .ssce file
  const jsonString = await bridge.loadSsce(file.path);
  const sessionData = await deserialize(jsonString);

  // Create offscreen canvas and render
  const offscreenCanvas = document.createElement("canvas");
  const canvasManager = new CanvasManager(offscreenCanvas);
  const layerManager = new LayerManager(canvasManager);

  canvasManager.setSize(sessionData.canvasSize.width, sessionData.canvasSize.height);
  layerManager.layers = sessionData.layers;
  layerManager.nextId = Math.max(...sessionData.layers.map((l) => l.id), 0) + 1;
  canvasManager.render();

  // Determine format for this file
  let mimeType;
  let ext;
  if (format === "auto") {
    // Check if canvas has transparency
    const hasTransparency = checkTransparency(offscreenCanvas);
    mimeType = hasTransparency ? "image/png" : "image/jpeg";
    ext = hasTransparency ? "png" : "jpg";
  } else if (format === "jpg") {
    mimeType = "image/jpeg";
    ext = "jpg";
  } else {
    mimeType = "image/png";
    ext = "png";
  }

  // Get image data
  const imageData = canvasManager.toDataURL(mimeType, 0.92);

  // Build output filename
  const baseName = file.name.replace(/\.ssce$/i, "");
  const imageFilename = `${baseName}.${ext}`;

  // Determine month subfolder if organizing
  const monthFolder = organizeByMonth && file.date ? file.date.substring(0, 7) : "";

  if (outputType === "zip") {
    const entryName = monthFolder ? `${monthFolder}/${imageFilename}` : imageFilename;
    await bridge.zipAddFile(zipId, entryName, imageData);
  } else {
    const dir = monthFolder ? `${outputPath}/${monthFolder}` : outputPath;
    await bridge.saveExportedImage(`${dir}/${imageFilename}`, imageData);
  }

  // Export snapshots if requested
  if (includeSnapshots && sessionData.snapshots && sessionData.snapshots.length > 0) {
    for (let s = 0; s < sessionData.snapshots.length; s++) {
      const snapshot = sessionData.snapshots[s];
      if (!snapshot.image) continue;

      const snapFilename = `${baseName}_snapshot_${s + 1}.png`;

      if (outputType === "zip") {
        const entryName = monthFolder ? `${monthFolder}/${snapFilename}` : snapFilename;
        await bridge.zipAddFile(zipId, entryName, snapshot.image);
      } else {
        const dir = monthFolder ? `${outputPath}/${monthFolder}` : outputPath;
        await bridge.saveExportedImage(`${dir}/${snapFilename}`, snapshot.image);
      }
    }
  }
}

/**
 * Check if a canvas has any transparent pixels
 * @param {HTMLCanvasElement} canvas
 * @returns {boolean}
 */
function checkTransparency(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample every 100th pixel for performance
  for (let i = 3; i < data.length; i += 400) {
    if (data[i] < 255) return true;
  }
  return false;
}
