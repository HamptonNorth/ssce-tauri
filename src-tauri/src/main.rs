// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

// ============================================================================
// Database State
// ============================================================================

struct DbState(Mutex<Connection>);

/// Initialize the SQLite database with FTS5 support
fn init_database() -> Result<Connection, rusqlite::Error> {
    let db_path = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ssce-desktop")
        .join("library.db");

    // Ensure directory exists
    if let Some(parent) = db_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let conn = Connection::open(&db_path)?;

    // Create main files table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY,
            path TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            thumbnail TEXT,
            title TEXT,
            summary TEXT,
            keywords TEXT,
            modified TEXT,
            last_opened TEXT,
            snapshot_count INTEGER DEFAULT 0
        )",
        [],
    )?;

    // Create FTS5 virtual table for full-text search
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
            filename,
            title,
            summary,
            keywords,
            content='files',
            content_rowid='id'
        )",
        [],
    )?;

    // Create triggers to keep FTS in sync
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
            INSERT INTO files_fts(rowid, filename, title, summary, keywords)
            VALUES (new.id, new.filename, new.title, new.summary, new.keywords);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
            INSERT INTO files_fts(files_fts, rowid, filename, title, summary, keywords)
            VALUES ('delete', old.id, old.filename, old.title, old.summary, old.keywords);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
            INSERT INTO files_fts(files_fts, rowid, filename, title, summary, keywords)
            VALUES ('delete', old.id, old.filename, old.title, old.summary, old.keywords);
            INSERT INTO files_fts(rowid, filename, title, summary, keywords)
            VALUES (new.id, new.filename, new.title, new.summary, new.keywords);
        END",
        [],
    )?;

    Ok(conn)
}

// ============================================================================
// Database Types
// ============================================================================

#[derive(Serialize, Deserialize)]
struct LibraryFile {
    id: Option<i64>,
    path: String,
    filename: String,
    thumbnail: Option<String>,
    title: Option<String>,
    summary: Option<String>,
    keywords: Option<String>,
    modified: Option<String>,
    last_opened: Option<String>,
    snapshot_count: i32,
}

#[derive(Deserialize)]
struct SearchParams {
    query: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
    limit: Option<i32>,
}

// ============================================================================
// Database Commands
// ============================================================================

/// Add or update a file in the library database
#[tauri::command]
fn db_upsert_file(state: State<DbState>, file: LibraryFile) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO files (path, filename, thumbnail, title, summary, keywords, modified, last_opened, snapshot_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(path) DO UPDATE SET
             filename = excluded.filename,
             thumbnail = excluded.thumbnail,
             title = excluded.title,
             summary = excluded.summary,
             keywords = excluded.keywords,
             modified = excluded.modified,
             last_opened = excluded.last_opened,
             snapshot_count = excluded.snapshot_count",
        params![
            file.path,
            file.filename,
            file.thumbnail,
            file.title,
            file.summary,
            file.keywords,
            file.modified,
            file.last_opened,
            file.snapshot_count,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(id)
}

/// Get recent files ordered by last_opened
#[tauri::command]
fn db_get_recent_files(state: State<DbState>, limit: i32) -> Result<Vec<LibraryFile>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, path, filename, thumbnail, title, summary, keywords, modified, last_opened, snapshot_count
             FROM files
             WHERE last_opened IS NOT NULL
             ORDER BY last_opened DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let files = stmt
        .query_map([limit], |row| {
            Ok(LibraryFile {
                id: Some(row.get(0)?),
                path: row.get(1)?,
                filename: row.get(2)?,
                thumbnail: row.get(3)?,
                title: row.get(4)?,
                summary: row.get(5)?,
                keywords: row.get(6)?,
                modified: row.get(7)?,
                last_opened: row.get(8)?,
                snapshot_count: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(files)
}

/// Search files using FTS5 and optional date filters
#[tauri::command]
fn db_search_files(state: State<DbState>, params: SearchParams) -> Result<Vec<LibraryFile>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let limit = params.limit.unwrap_or(50);

    // Build query based on whether we have a search term
    let (sql, use_fts) = if let Some(ref query) = params.query {
        if query.trim().is_empty() {
            (String::from(
                "SELECT id, path, filename, thumbnail, title, summary, keywords, modified, last_opened, snapshot_count
                 FROM files
                 WHERE 1=1"
            ), false)
        } else {
            (String::from(
                "SELECT f.id, f.path, f.filename, f.thumbnail, f.title, f.summary, f.keywords, f.modified, f.last_opened, f.snapshot_count
                 FROM files f
                 JOIN files_fts fts ON f.id = fts.rowid
                 WHERE files_fts MATCH ?1"
            ), true)
        }
    } else {
        (String::from(
            "SELECT id, path, filename, thumbnail, title, summary, keywords, modified, last_opened, snapshot_count
             FROM files
             WHERE 1=1"
        ), false)
    };

    // Add date filters and ordering
    let mut sql = sql;
    if params.from_date.is_some() {
        sql.push_str(" AND modified >= ?2");
    }
    if params.to_date.is_some() {
        sql.push_str(" AND modified <= ?3");
    }
    sql.push_str(" ORDER BY modified DESC LIMIT ?4");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    // Bind parameters based on query type
    let files = if use_fts {
        let query = params.query.as_ref().unwrap();
        // Convert simple search to FTS5 format (prefix matching)
        let fts_query = query
            .split_whitespace()
            .map(|w| format!("{}*", w))
            .collect::<Vec<_>>()
            .join(" ");

        stmt.query_map(
            params![
                fts_query,
                params.from_date.unwrap_or_default(),
                params.to_date.unwrap_or_default(),
                limit
            ],
            |row| {
                Ok(LibraryFile {
                    id: Some(row.get(0)?),
                    path: row.get(1)?,
                    filename: row.get(2)?,
                    thumbnail: row.get(3)?,
                    title: row.get(4)?,
                    summary: row.get(5)?,
                    keywords: row.get(6)?,
                    modified: row.get(7)?,
                    last_opened: row.get(8)?,
                    snapshot_count: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        stmt.query_map(
            params![
                "",  // placeholder for FTS query
                params.from_date.unwrap_or_default(),
                params.to_date.unwrap_or_default(),
                limit
            ],
            |row| {
                Ok(LibraryFile {
                    id: Some(row.get(0)?),
                    path: row.get(1)?,
                    filename: row.get(2)?,
                    thumbnail: row.get(3)?,
                    title: row.get(4)?,
                    summary: row.get(5)?,
                    keywords: row.get(6)?,
                    modified: row.get(7)?,
                    last_opened: row.get(8)?,
                    snapshot_count: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    Ok(files)
}

/// Remove a file from the library database
#[tauri::command]
fn db_remove_file(state: State<DbState>, path: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM files WHERE path = ?1", params![path])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Update last_opened timestamp for a file
#[tauri::command]
fn db_update_last_opened(state: State<DbState>, path: String, timestamp: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE files SET last_opened = ?1 WHERE path = ?2",
        params![timestamp, path],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Scan library folder and index all .ssce files
#[tauri::command]
fn db_rebuild_from_library(state: State<DbState>, library_path: String) -> Result<i32, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let path = Path::new(&library_path);
    if !path.exists() {
        return Err(format!("Library path does not exist: {}", library_path));
    }

    let mut count = 0;

    // Recursively find all .ssce files
    fn scan_dir(dir: &Path, conn: &Connection, count: &mut i32) -> Result<(), String> {
        let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_dir() {
                scan_dir(&path, conn, count)?;
            } else if path.extension().map(|e| e == "ssce").unwrap_or(false) {
                // Read and parse the .ssce file
                let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let json: serde_json::Value =
                    serde_json::from_str(&content).map_err(|e| e.to_string())?;

                let filename = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let thumbnail = json.get("thumbnail").and_then(|v| v.as_str()).map(String::from);
                let keywords = json.get("keywords").and_then(|v| {
                    v.as_array().map(|arr| {
                        arr.iter()
                            .filter_map(|k| k.as_str())
                            .collect::<Vec<_>>()
                            .join(" ")
                    })
                });

                let front_matter = json.get("frontMatter");
                let title = front_matter
                    .and_then(|fm| fm.get("title"))
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let summary = front_matter
                    .and_then(|fm| fm.get("summary"))
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let modified = front_matter
                    .and_then(|fm| fm.get("modified"))
                    .and_then(|v| v.as_str())
                    .map(String::from);

                let snapshot_count = json
                    .get("snapshots")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.len() as i32)
                    .unwrap_or(0);

                let path_str = path.to_string_lossy().to_string();

                // Use modified date as last_opened during rebuild (so files show in Recent)
                let last_opened = modified.clone();

                conn.execute(
                    "INSERT INTO files (path, filename, thumbnail, title, summary, keywords, modified, last_opened, snapshot_count)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                     ON CONFLICT(path) DO UPDATE SET
                         filename = excluded.filename,
                         thumbnail = excluded.thumbnail,
                         title = excluded.title,
                         summary = excluded.summary,
                         keywords = excluded.keywords,
                         modified = excluded.modified,
                         last_opened = COALESCE(files.last_opened, excluded.last_opened),
                         snapshot_count = excluded.snapshot_count",
                    params![path_str, filename, thumbnail, title, summary, keywords, modified, last_opened, snapshot_count],
                )
                .map_err(|e| e.to_string())?;

                *count += 1;
            }
        }

        Ok(())
    }

    scan_dir(path, &conn, &mut count)?;

    // Clean up stale entries (files in DB that no longer exist)
    let mut stmt = conn
        .prepare("SELECT id, path FROM files")
        .map_err(|e| e.to_string())?;

    let stale_ids: Vec<i64> = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let path: String = row.get(1)?;
            Ok((id, path))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .filter(|(_, path)| !Path::new(path).exists())
        .map(|(id, _)| id)
        .collect();

    for id in &stale_ids {
        conn.execute("DELETE FROM files WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
    }

    Ok(count)
}

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

/// Save text content to a file (for HTML export, etc.)
#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// Metadata extracted from a .ssce file
#[derive(Serialize)]
struct SsceMetadata {
    thumbnail: Option<String>,
    snapshot_count: u32,
}

/// Extract thumbnail and snapshot count from a .ssce file
#[tauri::command]
fn get_ssce_metadata(path: String) -> Result<SsceMetadata, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Ok(SsceMetadata {
            thumbnail: None,
            snapshot_count: 0,
        });
    }

    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Parse JSON
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Get thumbnail field if it exists
    let thumbnail = json.get("thumbnail")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string());

    // Get snapshot count
    let snapshot_count = json.get("snapshots")
        .and_then(|s| s.as_array())
        .map(|arr| arr.len() as u32)
        .unwrap_or(0);

    Ok(SsceMetadata {
        thumbnail,
        snapshot_count,
    })
}

/// Extract thumbnail from a .ssce file (legacy, kept for compatibility)
/// Returns the thumbnail data URL if present, or null if not found
#[tauri::command]
fn get_ssce_thumbnail(path: String) -> Result<Option<String>, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Parse JSON and extract thumbnail field
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Get thumbnail field if it exists
    if let Some(thumbnail) = json.get("thumbnail") {
        if let Some(thumb_str) = thumbnail.as_str() {
            return Ok(Some(thumb_str.to_string()));
        }
    }

    Ok(None)
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

/// Environment settings (build info only - paths now in defaults.json)
#[derive(Serialize)]
struct EnvConfig {
    show_build_timestamp: bool,
    build_timestamp: Option<String>,
}

/// Read build info settings
/// Path settings are now in defaults.json, this only returns build timestamp info
#[tauri::command]
fn get_env_config(app_handle: tauri::AppHandle) -> Result<EnvConfig, String> {
    // Check if we should show build timestamp (defaults to true)
    // Can be disabled via SHOW_BUILD_TIMESTAMP=false in environment
    let show_build_timestamp = std::env::var("SHOW_BUILD_TIMESTAMP")
        .map(|v| v.to_lowercase() != "false")
        .unwrap_or(true);

    // Get build timestamp from build-time.txt file (written by build-and-install.sh)
    let build_timestamp = if show_build_timestamp {
        // Try multiple locations for build-time.txt
        let mut time_str: Option<String> = None;

        // 1. Development path (relative to src-tauri directory)
        let dev_path = Path::new("../src/config/build-time.txt");
        if dev_path.exists() {
            time_str = fs::read_to_string(dev_path).ok().map(|s| s.trim().to_string());
        }

        // 2. Production path (bundled with app)
        if time_str.is_none() {
            if let Ok(resource_dir) = app_handle.path().resource_dir() {
                let resource_path = resource_dir.join("config/build-time.txt");
                if resource_path.exists() {
                    time_str = fs::read_to_string(&resource_path).ok().map(|s| s.trim().to_string());
                }
            }
        }

        // 3. Linux-specific production path
        #[cfg(target_os = "linux")]
        if time_str.is_none() {
            let linux_path = Path::new("/usr/lib/SSCE Desktop/config/build-time.txt");
            if linux_path.exists() {
                time_str = fs::read_to_string(linux_path).ok().map(|s| s.trim().to_string());
            }
        }

        time_str
    } else {
        None
    };

    Ok(EnvConfig {
        show_build_timestamp,
        build_timestamp,
    })
}

/// Get the user config directory path for SSCE
/// Returns ~/.config/ssce-desktop on Linux, AppData on Windows
fn get_user_config_dir() -> Result<std::path::PathBuf, String> {
    dirs::config_dir()
        .map(|p| p.join("ssce-desktop"))
        .ok_or_else(|| "Could not determine config directory".to_string())
}

/// Load the defaults.json configuration file
/// Priority: user config > bundled config > dev config
/// Expands ~ in paths.defaultImageLoad and paths.defaultImageSave
#[tauri::command]
fn get_defaults_config(app_handle: tauri::AppHandle) -> Result<String, String> {
    let json_str: String;

    // First, check for user-customized config
    if let Ok(user_config_dir) = get_user_config_dir() {
        let user_config_path = user_config_dir.join("defaults.json");
        if user_config_path.exists() {
            json_str = fs::read_to_string(&user_config_path)
                .map_err(|e| format!("Failed to read user defaults.json: {}", e))?;
            return expand_paths_in_config(json_str);
        }
    }

    // Try development path (relative to src-tauri directory)
    let dev_path = Path::new("../src/config/defaults.json");
    if dev_path.exists() {
        json_str = fs::read_to_string(dev_path)
            .map_err(|e| format!("Failed to read defaults.json: {}", e))?;
        return expand_paths_in_config(json_str);
    }

    // Try production path (bundled with app) using Tauri v2 API
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let resource_path = resource_dir.join("config/defaults.json");
        if resource_path.exists() {
            json_str = fs::read_to_string(&resource_path)
                .map_err(|e| format!("Failed to read defaults.json: {}", e))?;
            return expand_paths_in_config(json_str);
        }
    }

    // Try Linux-specific production path (deb package location)
    #[cfg(target_os = "linux")]
    {
        let linux_prod_path = Path::new("/usr/lib/SSCE Desktop/config/defaults.json");
        if linux_prod_path.exists() {
            json_str = fs::read_to_string(linux_prod_path)
                .map_err(|e| format!("Failed to read defaults.json: {}", e))?;
            return expand_paths_in_config(json_str);
        }
    }

    // Fallback: return error to trigger frontend fallback
    Err("defaults.json not found in any config paths".to_string())
}

/// Expand ~ to home directory in paths section of config JSON
fn expand_paths_in_config(json_str: String) -> Result<String, String> {
    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    // Parse JSON
    let mut config: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse defaults.json: {}", e))?;

    // Expand paths in the "paths" section if it exists
    if let Some(paths) = config.get_mut("paths") {
        if let Some(paths_obj) = paths.as_object_mut() {
            for (_key, value) in paths_obj.iter_mut() {
                if let Some(path_str) = value.as_str() {
                    if path_str.starts_with("~/") {
                        *value = serde_json::Value::String(
                            format!("{}{}", home_dir, &path_str[1..])
                        );
                    }
                }
            }
        }
    }

    // Serialize back to JSON
    serde_json::to_string(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))
}

/// Save defaults.json to user config directory
/// This allows user customization without modifying bundled files
#[tauri::command]
fn save_defaults_config(data: String) -> Result<String, String> {
    // Validate JSON before saving
    let _: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let user_config_dir = get_user_config_dir()?;

    // Create config directory if it doesn't exist
    if !user_config_dir.exists() {
        fs::create_dir_all(&user_config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let config_path = user_config_dir.join("defaults.json");
    let config_path_str = config_path.to_string_lossy().to_string();

    fs::write(&config_path, &data)
        .map_err(|e| format!("Failed to write defaults.json: {}", e))?;

    Ok(config_path_str)
}

/// Get the path where user config would be saved
#[tauri::command]
fn get_user_config_path() -> Result<String, String> {
    let user_config_dir = get_user_config_dir()?;
    let config_path = user_config_dir.join("defaults.json");
    Ok(config_path.to_string_lossy().to_string())
}

/// Open a file in the default browser
#[tauri::command]
fn open_in_default_app(path: String) -> Result<(), String> {
    // Convert to file:// URL
    let url = if path.starts_with("file://") {
        path
    } else {
        format!("file://{}", path)
    };

    #[cfg(target_os = "linux")]
    {
        // Skip xdg-open - try browsers directly to avoid text editor association
        let browsers = [
            "google-chrome",
            "google-chrome-stable",
            "chromium",
            "chromium-browser",
            "firefox",
        ];

        for browser in browsers {
            if std::process::Command::new(browser)
                .arg(&url)
                .spawn()
                .is_ok()
            {
                return Ok(());
            }
        }

        Err("No browser found. Install Chrome, Chromium, or Firefox.".to_string())
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
        Ok(())
    }
}

fn main() {
    // Initialize database
    let db = init_database().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(DbState(Mutex::new(db)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            // Set window icon
            if let Some(window) = app.get_webview_window("main") {
                let window_icon = Image::from_bytes(include_bytes!("../icons/128x128.png"))
                    .expect("Failed to load window icon");
                let _ = window.set_icon(window_icon);
            }

            // Create tray menu
            let show_item = MenuItem::with_id(app, "show", "Show SSCE", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Load tray icon
            let icon = Image::from_path("icons/tray-icon.png")
                .unwrap_or_else(|_| Image::from_bytes(include_bytes!("../icons/tray-icon.png")).expect("Failed to load embedded tray icon"));

            // Build the system tray
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("SSCE Desktop")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Intercept close event and minimize to tray instead
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Save window state before hiding
                let _ = window.app_handle().save_window_state(StateFlags::all());
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            browse_directory,
            load_image,
            save_image,
            load_ssce,
            save_ssce,
            save_text_file,
            get_ssce_thumbnail,
            get_ssce_metadata,
            file_exists,
            save_autosave,
            delete_autosave,
            list_autosave_files,
            get_home_dir,
            get_downloads_dir,
            get_env_config,
            get_defaults_config,
            save_defaults_config,
            get_user_config_path,
            open_in_default_app,
            db_upsert_file,
            db_get_recent_files,
            db_search_files,
            db_remove_file,
            db_update_last_opened,
            db_rebuild_from_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
