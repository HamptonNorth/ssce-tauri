// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::fs;
use std::path::Path;

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
            get_home_dir,
            get_downloads_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
