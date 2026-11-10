use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use docx_rs::{AlignmentType, BreakType, Docx, Paragraph, Run, RunFonts};
use serde::{Deserialize, Serialize};

use crate::domain::Project;
use crate::error::CadenceError;
use crate::sweep::AssembledScene;

/// Options controlling manuscript DOCX generation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DocxExportOptions {
    pub include_title: bool,
    pub include_metadata: bool,
    pub scene_separator: String, // ej. "#" o "* * *"
    pub font_family: String,     // default: "Courier New"
    pub font_size: usize,        // default: 24 (12pt en half-points)
}

impl Default for DocxExportOptions {
    fn default() -> Self {
        Self {
            include_title: true,
            include_metadata: false,
            scene_separator: "#".to_string(),
            font_family: "Courier New".to_string(),
            font_size: 24,
        }
    }
}

/// Renders a project and assembled narrative scenes into a valid DOCX manuscript byte buffer.
pub fn export_docx(
    project: &Project,
    scenes: &[AssembledScene],
    options: &DocxExportOptions,
) -> Result<Vec<u8>, CadenceError> {
    let run_fonts = RunFonts::new()
        .ascii(&options.font_family)
        .hi_ansi(&options.font_family);

    let mut docx = Docx::new()
        .default_fonts(run_fonts.clone())
        .default_size(options.font_size);

    if options.include_title {
        let title = project.title.trim();
        if !title.is_empty() {
            let title_run = Run::new()
                .bold()
                .size(options.font_size + 4)
                .fonts(run_fonts.clone())
                .add_text(title);
            docx = docx.add_paragraph(Paragraph::new().align(AlignmentType::Center).add_run(title_run));

            let author = project.author.trim();
            if !author.is_empty() {
                let author_run = Run::new()
                    .size(options.font_size)
                    .fonts(run_fonts.clone())
                    .add_text(format!("Author: {author}"));
                docx = docx.add_paragraph(Paragraph::new().align(AlignmentType::Center).add_run(author_run));
            }
            docx = docx.add_paragraph(Paragraph::new());
        }
    }

    let mut first_scene = true;
    for assembled in scenes {
        if !first_scene && !options.scene_separator.is_empty() {
            let sep_run = Run::new()
                .size(options.font_size)
                .fonts(run_fonts.clone())
                .add_text(&options.scene_separator);
            docx = docx.add_paragraph(Paragraph::new().align(AlignmentType::Center).add_run(sep_run));
        }
        first_scene = false;

        if options.include_title {
            let scene_title = assembled.scene.title.trim();
            if !scene_title.is_empty() {
                let scene_title_run = Run::new()
                    .bold()
                    .size(options.font_size)
                    .fonts(run_fonts.clone())
                    .add_text(scene_title);
                docx = docx.add_paragraph(Paragraph::new().add_run(scene_title_run));
            }
        }

        if options.include_metadata {
            let track_name = assembled.track.name.trim();
            let meta_run = Run::new()
                .italic()
                .size(options.font_size)
                .fonts(run_fonts.clone())
                .add_text(format!("Track: {track_name} | Time: {}", assembled.scene.t_start));
            docx = docx.add_paragraph(Paragraph::new().add_run(meta_run));
        }

        let body = assembled.scene.text.trim();
        if !body.is_empty() {
            let paragraphs = body.split("\n\n");
            for p_text in paragraphs {
                let clean_p = p_text.trim();
                if !clean_p.is_empty() {
                    let mut p = Paragraph::new();
                    let lines: Vec<&str> = clean_p.split('\n').collect();
                    for (idx, line) in lines.iter().enumerate() {
                        let mut r = Run::new()
                            .size(options.font_size)
                            .fonts(run_fonts.clone())
                            .add_text(*line);
                        if idx + 1 < lines.len() {
                            r = r.add_break(BreakType::TextWrapping);
                        }
                        p = p.add_run(r);
                    }
                    docx = docx.add_paragraph(p);
                }
            }
        }
    }

    let mut buf = std::io::Cursor::new(Vec::new());
    docx.pack(&mut buf)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    Ok(buf.into_inner())
}

/// Atomically exports a project and assembled narrative scenes to a DOCX file on disk.
///
/// Implements the atomic write-to-temp-and-rename protocol:
/// 1. Prepares the destination directory.
/// 2. Writes output to a temporary sibling file (`.tmp-export-docx-<uuid>-<filename>`).
/// 3. Flushes OS page caches via `file.sync_all()`.
/// 4. Atomically renames (`std::fs::rename`) the temporary file to target path.
/// 5. Cleans up temp file if any error occurs prior to atomic rename.
pub fn export_docx_to_file<P: AsRef<Path>>(
    path: P,
    project: &Project,
    scenes: &[AssembledScene],
    options: &DocxExportOptions,
) -> Result<(), CadenceError> {
    let target_path = path.as_ref();

    if let Some(parent) = target_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }

    let file_stem = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("export.docx");
    let tmp_name = format!(".tmp-export-docx-{}-{}", uuid::Uuid::new_v4(), file_stem);
    let tmp_path = match target_path.parent() {
        Some(p) if !p.as_os_str().is_empty() => p.join(tmp_name),
        _ => std::path::PathBuf::from(tmp_name),
    };

    let write_res = (|| -> Result<(), CadenceError> {
        let bytes = export_docx(project, scenes, options)?;
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp_path)?;
        file.write_all(&bytes)?;
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
