// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::Manager;

/// Represents a file or directory entry for directory listings
#[derive(Serialize)]
struct FileEntry {
    name: String,
    is_dir: bool,
    size: u64,
}

/// Browse a directory and return list of files/directories
/// Filters: "all", "ssce", "images"
#[tauri::command]
fn browse_directory(dir: String, filter: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir);

    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    let read_dir = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files (starting with .)
        if name.starts_with('.') {
            continue;
        }

        let is_dir = metadata.is_dir();
        let size = if is_dir { 0 } else { metadata.len() };

        // Apply filter for files (directories always included)
        if !is_dir {
            let lower_name = name.to_lowercase();
            let include = match filter.as_str() {
                "ssce" => lower_name.ends_with(".ssce"),
                "images" => {
                    lower_name.ends_with(".png")
                        || lower_name.ends_with(".jpg")
                        || lower_name.ends_with(".jpeg")
                        || lower_name.ends_with(".gif")
                        || lower_name.ends_with(".webp")
                        || lower_name.ends_with(".bmp")
                }
                _ => true, // "all" or any other value
            };

            if !include {
                continue;
            }
        }

        entries.push(FileEntry { name, is_dir, size });
    }

    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Load an image file and return as base64-encoded string
#[tauri::command]
fn load_image(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let data = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Determine MIME type from extension
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    };

    let base64_data = STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// Save base64-encoded image data to a file
#[tauri::command]
fn save_image(path: String, data: String) -> Result<(), String> {
    // Strip data URL prefix if present (e.g., "data:image/png;base64,")
    let base64_data = if let Some(comma_pos) = data.find(',') {
        &data[comma_pos + 1..]
    } else {
        &data
    };

    let decoded = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    fs::write(&path, decoded).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Load a .ssce JSON file and return its contents
#[tauri::command]
fn load_ssce(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Save JSON data to a .ssce file
#[tauri::command]
fn save_ssce(path: String, data: String) -> Result<(), String> {
    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    fs::write(&path, data).map_err(|e| format!("Failed to write file: {}", e))
}

/// Check if a file exists
#[tauri::command]
fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

// ============================================================================
// Autosave Commands
// ============================================================================

/// Autosave file entry with metadata
#[derive(Serialize)]
struct AutosaveEntry {
    name: String,
    path: String,
    mtime: u64,
}

/// Save autosave data to a temp file
/// Creates the directory if it doesn't exist
#[tauri::command]
fn save_autosave(data: String, filename: String, directory: String) -> Result<String, String> {
    let dir_path = Path::new(&directory);

    // Create directory if it doesn't exist
    if !dir_path.exists() {
        fs::create_dir_all(dir_path)
            .map_err(|e| format!("Failed to create autosave directory: {}", e))?;
    }

    let file_path = dir_path.join(&filename);
    let full_path = file_path.to_string_lossy().to_string();

    fs::write(&file_path, &data)
        .map_err(|e| format!("Failed to write autosave file: {}", e))?;

    Ok(full_path)
}

/// Delete an autosave temp file
#[tauri::command]
fn delete_autosave(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if file_path.exists() {
        fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete autosave file: {}", e))?;
    }

    Ok(())
}

/// List autosave files in a directory
/// Returns files with .ssce extension, sorted by modification time (newest first)
#[tauri::command]
fn list_autosave_files(directory: String) -> Result<Vec<AutosaveEntry>, String> {
    let dir_path = Path::new(&directory);

    if !dir_path.exists() {
        // Directory doesn't exist, no recovery files
        return Ok(Vec::new());
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory));
    }

    let mut entries: Vec<AutosaveEntry> = Vec::new();

    let read_dir = fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read autosave directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;

        // Skip directories
        if metadata.is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();

        // Only include .ssce files
        if !name.to_lowercase().ends_with(".ssce") {
            continue;
        }

        // Get modification time as unix timestamp
        let mtime = metadata
            .modified()
            .map_err(|e| format!("Failed to get mtime: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let path = entry.path().to_string_lossy().to_string();

        entries.push(AutosaveEntry { name, path, mtime });
    }

    // Sort by modification time, newest first
    entries.sort_by(|a, b| b.mtime.cmp(&a.mtime));

    Ok(entries)
}

/// Get the user's home directory
#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

/// Get the user's downloads directory
#[tauri::command]
fn get_downloads_dir() -> Result<String, String> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine downloads directory".to_string())
}

/// Environment settings from .env file
#[derive(Serialize)]
struct EnvConfig {
    default_path_image_load: Option<String>,
    default_path_image_save: Option<String>,
    show_git_hash: bool,
    git_hash: Option<String>,
}

/// Read environment settings from .env file
/// Returns paths with ~ expanded to home directory
#[tauri::command]
fn get_env_config() -> Result<EnvConfig, String> {
    // Try to load .env file from the app's resource directory or current directory
    let _ = dotenvy::dotenv(); // Ignore error if .env doesn't exist

    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    // Helper to expand ~ in paths
    let expand_path = |value: Option<String>| -> Option<String> {
        value.map(|v| {
            if v.starts_with("~/") {
                format!("{}{}", home_dir, &v[1..])
            } else {
                v
            }
        })
    };

    // Check if we should show git hash (defaults to true, can be disabled via .env)
    let show_git_hash = std::env::var("SHOW_GIT_HASH")
        .map(|v| v.to_lowercase() != "false")
        .unwrap_or(true);

    // Get git hash from compile-time environment variable
    let git_hash = if show_git_hash {
        Some(env!("GIT_HASH").to_string())
    } else {
        None
    };

    Ok(EnvConfig {
        default_path_image_load: expand_path(std::env::var("DEFAULT_PATH_IMAGE_LOAD").ok()),
        default_path_image_save: expand_path(std::env::var("DEFAULT_PATH_IMAGE_SAVE").ok()),
        show_git_hash,
        git_hash,
    })
}

/// Load the defaults.json configuration file
/// Reads from src/config/defaults.json and returns the JSON content
#[tauri::command]
fn get_defaults_config(app_handle: tauri::AppHandle) -> Result<String, String> {
    // In development, read from the source directory
    // In production, read from the bundled resources

    // Try development path first (relative to src-tauri directory)
    let dev_path = Path::new("../src/config/defaults.json");
    if dev_path.exists() {
        return fs::read_to_string(dev_path)
            .map_err(|e| format!("Failed to read defaults.json: {}", e));
    }

    // Try production path (bundled with app) using Tauri v2 API
    // This works cross-platform (Linux, Windows, macOS)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let resource_path = resource_dir.join("config/defaults.json");
        if resource_path.exists() {
            return fs::read_to_string(&resource_path)
                .map_err(|e| format!("Failed to read defaults.json: {}", e));
        }
    }

    // Try Linux-specific production path (deb package location)
    #[cfg(target_os = "linux")]
    {
        let linux_prod_path = Path::new("/usr/lib/SSCE Desktop/config/defaults.json");
        if linux_prod_path.exists() {
            return fs::read_to_string(linux_prod_path)
                .map_err(|e| format!("Failed to read defaults.json: {}", e));
        }
    }

    // Fallback: return error to trigger frontend fallback
    Err("defaults.json not found in dev or production paths".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            browse_directory,
            load_image,
            save_image,
            load_ssce,
            save_ssce,
            file_exists,
            save_autosave,
            delete_autosave,
            list_autosave_files,
            get_home_dir,
            get_downloads_dir,
            get_env_config,
            get_defaults_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
