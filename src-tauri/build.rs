use std::process::Command;

fn main() {
    // Get git hash at build time
    let git_hash = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Debug: print to stderr so it shows in build output
    eprintln!("build.rs: Setting GIT_HASH={}", git_hash);

    println!("cargo:rustc-env=GIT_HASH={}", git_hash);

    // Rerun if git HEAD changes (new commits, branch switches)
    println!("cargo:rerun-if-changed=../.git/HEAD");
    // Rerun if any branch ref changes (covers commits to current branch)
    println!("cargo:rerun-if-changed=../.git/refs/heads/");
    // Also check the index for uncommitted state detection
    println!("cargo:rerun-if-changed=../.git/index");

    tauri_build::build()
}
