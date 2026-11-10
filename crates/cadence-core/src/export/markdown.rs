use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use serde::{Deserialize, Serialize};

use crate::domain::Project;
use crate::error::CadenceError;
use crate::sweep::AssembledScene;

/// Options controlling manuscript Markdown generation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MarkdownExportOptions {
    pub include_title: bool,
    pub include_metadata: bool, // POV / track name, time
    pub scene_separator: String, // ej. "\n\n* * *\n\n"
}

impl Default for MarkdownExportOptions {
    fn default() -> Self {
        Self {
            include_title: true,
            include_metadata: false,
            scene_separator: "\n\n* * *\n\n".to_string(),
        }
    }
}

/// Renders a project and assembled narrative scenes into a deterministic Markdown manuscript string.
pub fn export_markdown(
    project: &Project,
    scenes: &[AssembledScene],
    options: &MarkdownExportOptions,
) -> String {
    let mut out = String::new();

    if options.include_title {
        let title = project.title.trim();
        if !title.is_empty() {
            out.push_str(&format!("# {title}\n\n"));
            let author = project.author.trim();
            if !author.is_empty() {
                out.push_str(&format!("Author: {author}\n\n"));
            }
        }
    }

    let mut scene_parts = Vec::with_capacity(scenes.len());
    for assembled in scenes {
        let mut part = String::new();
        if options.include_title {
            let scene_title = assembled.scene.title.trim();
            if !scene_title.is_empty() {
                part.push_str(&format!("## {scene_title}\n\n"));
            }
        }

        if options.include_metadata {
            let track_name = assembled.track.name.trim();
            part.push_str(&format!(
                "> Track: {track_name} | Time: {}\n\n",
                assembled.scene.t_start
            ));
        }

        let body = assembled.scene.text.trim();
        if !body.is_empty() {
            part.push_str(body);
        }

        let trimmed_part = part.trim();
        if !trimmed_part.is_empty() {
            scene_parts.push(trimmed_part.to_string());
        }
    }

    if !scene_parts.is_empty() {
        let joined_body = scene_parts.join(&options.scene_separator);
        out.push_str(&joined_body);
    }

    let trimmed_total = out.trim_end();
    if trimmed_total.is_empty() {
        String::new()
    } else {
        format!("{trimmed_total}\n")
    }
}

/// Atomically exports a project and assembled narrative scenes to a Markdown file on disk.
///
/// Implements the atomic write-to-temp-and-rename protocol:
/// 1. Prepares the destination directory.
/// 2. Writes output to a temporary file (`path.with_extension("tmp-export-<uuid>")`).
/// 3. Flushes OS page caches via `file.sync_all()`.
/// 4. Atomically renames (`std::fs::rename`) the temporary file to target path.
/// 5. Cleans up temp file if any error occurs prior to atomic rename.
pub fn export_markdown_to_file<P: AsRef<Path>>(
    path: P,
    project: &Project,
    scenes: &[AssembledScene],
    options: &MarkdownExportOptions,
) -> Result<(), CadenceError> {
    let target_path = path.as_ref();

    if let Some(parent) = target_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }

    let tmp_ext = format!("tmp-export-{}", uuid::Uuid::new_v4());
    let tmp_path = target_path.with_extension(tmp_ext);

    let write_res = (|| -> Result<(), CadenceError> {
        let content = export_markdown(project, scenes, options);
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp_path)?;
        file.write_all(content.as_bytes())?;
        file.sync_all()?;
        drop(file);
        std::fs::rename(&tmp_path, target_path)?;
        Ok(())
    })();

    if write_res.is_err() {
        let _ = std::fs::remove_file(&tmp_path);
    }

    write_res
}
