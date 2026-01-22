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

    Ok(EnvConfig {
        default_path_image_load: expand_path(std::env::var("DEFAULT_PATH_IMAGE_LOAD").ok()),
        default_path_image_save: expand_path(std::env::var("DEFAULT_PATH_IMAGE_SAVE").ok()),
    })
}

/// Load the defaults.js configuration file
/// Reads from src/config/defaults.js and returns the JavaScript content as JSON
#[tauri::command]
fn get_defaults_config(app_handle: tauri::AppHandle) -> Result<String, String> {
    // In development, read from the source directory
    // In production, read from the bundled resources

    // Try development path first (relative to src-tauri directory)
    let dev_path = Path::new("../src/config/defaults.js");
    if dev_path.exists() {
        let content = fs::read_to_string(dev_path)
            .map_err(|e| format!("Failed to read defaults.js: {}", e))?;
        return parse_js_config(&content);
    }

    // Try production path (bundled with app) using Tauri v2 API
    let resource_path = app_handle.path().resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?
        .join("config/defaults.js");

    if resource_path.exists() {
        let content = fs::read_to_string(&resource_path)
            .map_err(|e| format!("Failed to read defaults.js: {}", e))?;
        return parse_js_config(&content);
    }

    // Fallback: return error to trigger frontend fallback
    Err("defaults.js not found".to_string())
}

/// Parse a JavaScript config file and extract the default export as JSON
/// This is a simple parser that extracts the object from "export default { ... }"
fn parse_js_config(content: &str) -> Result<String, String> {
    // Find "export default" and extract the object
    // The JS file format is: export default { ... };

    // Remove single-line comments
    let lines: Vec<&str> = content.lines()
        .map(|line| {
            if let Some(pos) = line.find("//") {
                &line[..pos]
            } else {
                line
            }
        })
        .collect();
    let cleaned = lines.join("\n");

    // Find the start of the object after "export default"
    if let Some(start) = cleaned.find("export default") {
        let after_export = &cleaned[start + 14..]; // Skip "export default"

        // Find the opening brace
        if let Some(brace_start) = after_export.find('{') {
            let object_start = start + 14 + brace_start;

            // Find matching closing brace by counting braces
            let mut depth = 0;
            let mut end_pos = 0;
            for (i, c) in cleaned[object_start..].chars().enumerate() {
                match c {
                    '{' => depth += 1,
                    '}' => {
                        depth -= 1;
                        if depth == 0 {
                            end_pos = object_start + i + 1;
                            break;
                        }
                    }
                    _ => {}
                }
            }

            if end_pos > 0 {
                let object_str = &cleaned[object_start..end_pos];
                // Convert JS object to JSON (add quotes to keys, handle trailing commas)
                return convert_js_to_json(object_str);
            }
        }
    }

    Err("Could not parse defaults.js".to_string())
}

/// Convert JavaScript object notation to valid JSON
fn convert_js_to_json(js: &str) -> Result<String, String> {
    let mut json = String::new();
    let mut in_string = false;
    let mut in_key = false;
    let mut key_start = false;

    let chars: Vec<char> = js.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        match c {
            '"' if !in_string || (i > 0 && chars[i-1] != '\\') => {
                in_string = !in_string;
                json.push(c);
            }
            ':' if !in_string => {
                if key_start {
                    json.push('"');
                    key_start = false;
                }
                in_key = false;
                json.push(c);
            }
            '{' | '[' if !in_string => {
                json.push(c);
                in_key = c == '{';
            }
            '}' | ']' if !in_string => {
                // Remove trailing comma before closing brace/bracket
                let trimmed = json.trim_end();
                if trimmed.ends_with(',') {
                    json = trimmed[..trimmed.len()-1].to_string();
                }
                json.push(c);
                in_key = false;
            }
            ',' if !in_string => {
                if key_start {
                    json.push('"');
                    key_start = false;
                }
                json.push(c);
                in_key = true;
            }
            c if c.is_alphabetic() && !in_string && in_key && !key_start => {
                // Start of unquoted key - add opening quote
                json.push('"');
                json.push(c);
                key_start = true;
            }
            _ => {
                json.push(c);
            }
        }
        i += 1;
    }

    // Validate it's valid JSON
    match serde_json::from_str::<serde_json::Value>(&json) {
        Ok(_) => Ok(json),
        Err(e) => Err(format!("Invalid JSON after conversion: {} - JSON was: {}", e, &json[..json.len().min(200)]))
    }
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
            get_env_config,
            get_defaults_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
