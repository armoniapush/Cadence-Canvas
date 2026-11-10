use std::path::PathBuf;
use clap::{Parser, Subcommand};
use cadence_core::{
    assemble_project, export_docx_to_file, export_markdown_to_file, CadenceError, Database,
    DocxExportOptions, MarkdownExportOptions, Project, Scene, Track, DEFAULT_TRACK_COLOR,
};

const EX_CONFLICT: i32 = 75;
const EX_GENERAL: i32 = 1;

#[derive(Parser)]
#[command(name = "cadence", version = cadence_core::VERSION, about = "Cadence Canvas Narrative Station CLI")]
struct Cli {
    #[arg(long, global = true, help = "Output structured JSON to stdout")]
    json: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new .cadence database project
    Init {
        path: PathBuf,
        #[arg(short, long, default_value = "Untitled Project")]
        title: String,
        #[arg(short, long, default_value = "")]
        author: String,
    },
    /// Manage narrative projects
    Project {
        #[command(subcommand)]
        command: ProjectCommands,
    },
    /// Manage storyline tracks
    Track {
        #[command(subcommand)]
        command: TrackCommands,
    },
    /// Manage scene blocks
    Scene {
        #[command(subcommand)]
        command: SceneCommands,
    },
    /// Export narrative manuscripts
    Export {
        #[command(subcommand)]
        command: ExportCommands,
    },
}

#[derive(Subcommand)]
enum ExportCommands {
    /// Export manuscript to Markdown
    Md {
        path: PathBuf,
        #[arg(long)]
        project: String,
        #[arg(short, long)]
        output: PathBuf,
        #[arg(long)]
        no_title: bool,
        #[arg(long)]
        metadata: bool,
    },
    /// Export manuscript to standard DOCX
    Docx {
        path: PathBuf,
        #[arg(long)]
        project: String,
        #[arg(short, long)]
        output: PathBuf,
        #[arg(long)]
        no_title: bool,
        #[arg(long)]
        metadata: bool,
        #[arg(long, default_value = "#")]
        scene_separator: String,
        #[arg(long, default_value = "Courier New")]
        font_family: String,
        #[arg(long, default_value_t = 24)]
        font_size: usize,
    },
}

#[derive(Subcommand)]
enum ProjectCommands {
    /// List all projects in a .cadence file
    List { path: PathBuf },
}

#[derive(Subcommand)]
enum TrackCommands {
    /// Add a new track to a project
    Add {
        path: PathBuf,
        #[arg(long)]
        project: String,
        #[arg(long)]
        name: String,
        #[arg(long, default_value = DEFAULT_TRACK_COLOR)]
        color: String,
        #[arg(long, default_value_t = 0)]
        order: i64,
    },
    /// List all tracks for a project
    List {
        path: PathBuf,
        #[arg(long)]
        project: String,
    },
    /// Mute or unmute a track
    Mute {
        path: PathBuf,
        #[arg(long)]
        id: String,
        #[arg(long)]
        unmute: bool,
    },
}

#[derive(Subcommand)]
enum SceneCommands {
    /// Add a scene block to a track
    Add {
        path: PathBuf,
        #[arg(long)]
        track: String,
        #[arg(long)]
        title: String,
        #[arg(long)]
        time: i64,
        #[arg(long)]
        duration: i64,
        #[arg(long, default_value = "")]
        text: String,
        #[arg(long = "z-index", default_value_t = 0)]
        z_index: i64,
    },
    /// List scenes by project or track
    List {
        path: PathBuf,
        #[arg(long, required_unless_present = "track", conflicts_with = "track")]
        project: Option<String>,
        #[arg(long, required_unless_present = "project", conflicts_with = "project")]
        track: Option<String>,
    },
    /// Get a scene by ID
    Get {
        path: PathBuf,
        #[arg(long)]
        id: String,
    },
    /// Edit scene content under optimistic concurrency control
    Edit {
        path: PathBuf,
        #[arg(long)]
        id: String,
        #[arg(long)]
        version: i64,
        #[arg(long)]
        title: Option<String>,
        #[arg(long)]
        text: Option<String>,
    },
    /// Move scene coordinates under optimistic concurrency control
    Move {
        path: PathBuf,
        #[arg(long)]
        id: String,
        #[arg(long)]
        version: i64,
        #[arg(long)]
        track: String,
        #[arg(long)]
        time: i64,
        #[arg(long)]
        duration: i64,
    },
}

fn run(cli: &Cli) -> Result<(), CadenceError> {
    match &cli.command {
        Commands::Init { path, title, author } => {
            let db = Database::open(path)?;
            let proj = Project::create(db.conn(), title, author)?;
            if cli.json {
                println!("{}", serde_json::to_string_pretty(&proj)?);
            } else {
                println!("Initialized project '{}' ({}) at {}", proj.title, proj.id, path.display());
            }
        }
        Commands::Project { command } => match command {
            ProjectCommands::List { path } => {
                let db = Database::open(path)?;
                let list = Project::list(db.conn())?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&list)?);
                } else {
                    for p in &list {
                        println!("{:<36}  {:<24}  {}", p.id, p.title, p.author);
                    }
                }
            }
        },
        Commands::Track { command } => match command {
            TrackCommands::Add { path, project, name, color, order } => {
                let db = Database::open(path)?;
                let track = Track::create(db.conn(), project, name, color, *order)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&track)?);
                } else {
                    println!("Created track '{}' ({}) order={}", track.name, track.id, track.track_order);
                }
            }
            TrackCommands::List { path, project } => {
                let db = Database::open(path)?;
                let list = Track::list_by_project(db.conn(), project)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&list)?);
                } else {
                    for t in &list {
                        println!("{:<36}  order={:<3}  muted={:<5}  color={:<7}  {}", t.id, t.track_order, t.is_muted, t.color_hex, t.name);
                    }
                }
            }
            TrackCommands::Mute { path, id, unmute } => {
                let db = Database::open(path)?;
                Track::set_muted(db.conn(), id, !unmute)?;
                let track = Track::get_by_id(db.conn(), id)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&track)?);
                } else {
                    println!("Track '{}' is_muted={}", track.id, track.is_muted);
                }
            }
        },
        Commands::Scene { command } => match command {
            SceneCommands::Add { path, track, title, time, duration, text, z_index } => {
                let db = Database::open(path)?;
                let scene = Scene::create(db.conn(), track, *time, *duration, *z_index, title, text)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&scene)?);
                } else {
                    println!("Created scene '{}' ({}) at [{}, +{}] v={}", scene.title, scene.id, scene.t_start, scene.duration, scene.version);
                }
            }
            SceneCommands::List { path, project, track } => {
                let db = Database::open(path)?;
                let list = match (project.as_deref(), track.as_deref()) {
                    (Some(p), None) => Scene::list_by_project(db.conn(), p)?,
                    (None, Some(t)) => Scene::list_by_track(db.conn(), t)?,
                    _ => unreachable!("clap enforces exactly one of --project or --track"),
                };
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&list)?);
                } else {
                    for s in &list {
                        println!("{:<36}  track={:<36}  t={:<4}  dur={:<4}  v={:<2}  {}", s.id, s.track_id, s.t_start, s.duration, s.version, s.title);
                    }
                }
            }
            SceneCommands::Get { path, id } => {
                let db = Database::open(path)?;
                let scene = Scene::get_by_id(db.conn(), id)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&scene)?);
                } else {
                    println!("Scene: {} ({})\nTrack: {}\nTime: {} (duration {})\nVersion: {}\nWords: {}, Chars: {}\n\n{}",
                        scene.title, scene.id, scene.track_id, scene.t_start, scene.duration, scene.version, scene.word_count, scene.char_count, scene.text);
                }
            }
            SceneCommands::Edit { path, id, version, title, text } => {
                let db = Database::open(path)?;
                let current = Scene::get_by_id(db.conn(), id)?;
                let title_ref = title.as_deref().unwrap_or(&current.title);
                let text_ref = text.as_deref().unwrap_or(&current.text);
                let scene = Scene::update_content(db.conn(), id, *version, title_ref, text_ref)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&scene)?);
                } else {
                    println!("Updated scene '{}' to version {}", scene.id, scene.version);
                }
            }
            SceneCommands::Move { path, id, version, track, time, duration } => {
                let db = Database::open(path)?;
                let scene = Scene::move_coordinates(db.conn(), id, *version, track, *time, *duration)?;
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&scene)?);
                } else {
                    println!("Moved scene '{}' to track={}, t={}, dur={}, v={}", scene.id, scene.track_id, scene.t_start, scene.duration, scene.version);
                }
            }
        },
        Commands::Export { command } => match command {
            ExportCommands::Md {
                path,
                project,
                output,
                no_title,
                metadata,
            } => {
                let db = Database::open(path)?;
                let proj = Project::get_by_id(db.conn(), project)?;
                let scenes = assemble_project(db.conn(), project)?;
                let options = MarkdownExportOptions {
                    include_title: !*no_title,
                    include_metadata: *metadata,
                    ..Default::default()
                };
                export_markdown_to_file(output, &proj, &scenes, &options)?;

                if cli.json {
                    let total_words: i64 = scenes.iter().map(|s| s.scene.word_count).sum();
                    let bytes_written = std::fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                    println!(
                        "{}",
                        serde_json::json!({
                            "status": "ok",
                            "project_id": proj.id,
                            "format": "markdown",
                            "output": output.display().to_string(),
                            "scene_count": scenes.len(),
                            "word_count": total_words,
                            "bytes_written": bytes_written,
                        })
                    );
                } else {
                    println!(
                        "Exported {} scenes to {} (project: '{}')",
                        scenes.len(),
                        output.display(),
                        proj.title
                    );
                }
            }
            ExportCommands::Docx {
                path,
                project,
                output,
                no_title,
                metadata,
                scene_separator,
                font_family,
                font_size,
            } => {
                let db = Database::open(path)?;
                let proj = Project::get_by_id(db.conn(), project)?;
                let scenes = assemble_project(db.conn(), project)?;
                let options = DocxExportOptions {
                    include_title: !*no_title,
                    include_metadata: *metadata,
                    scene_separator: scene_separator.clone(),
                    font_family: font_family.clone(),
                    font_size: *font_size,
                };
                export_docx_to_file(output, &proj, &scenes, &options)?;

                if cli.json {
                    let total_words: i64 = scenes.iter().map(|s| s.scene.word_count).sum();
                    let bytes_written = std::fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                    println!(
                        "{}",
                        serde_json::json!({
                            "status": "ok",
                            "project_id": proj.id,
                            "format": "docx",
                            "output": output.display().to_string(),
                            "scene_count": scenes.len(),
                            "word_count": total_words,
                            "bytes_written": bytes_written,
                        })
                    );
                } else {
                    println!(
                        "Exported {} scenes to {} (project: '{}')",
                        scenes.len(),
                        output.display(),
                        proj.title
                    );
                }
            }
        },
    }
    Ok(())
}

fn main() {
    let cli = Cli::parse();
    if let Err(err) = run(&cli) {
        let is_conflict = matches!(err, CadenceError::StaleMutationConflict { .. });
        if cli.json {
            println!("{}", serde_json::json!({
                "error": err.to_string(),
                "conflict": is_conflict,
            }));
        }
        eprintln!("Error: {err}");
        std::process::exit(if is_conflict { EX_CONFLICT } else { EX_GENERAL });
    }
}
