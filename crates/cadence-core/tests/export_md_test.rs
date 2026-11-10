use cadence_core::{
    assemble_project, export_markdown, export_markdown_to_file, Database, MarkdownExportOptions,
    Project, Scene, Track, DEFAULT_TRACK_COLOR,
};
use tempfile::tempdir;

#[test]
fn test_export_markdown_deterministic_output() {
    let db = Database::open_in_memory().expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Dune Messiah", "Frank Herbert").expect("Project failed");

    let track_paul = Track::create(conn, &project.id, "Paul Atreides", DEFAULT_TRACK_COLOR, 0)
        .expect("Track paul failed");
    let track_guild = Track::create(conn, &project.id, "Guild Navigator", "#10b981", 1)
        .expect("Track guild failed");

    // Scene 1: Paul at t=10
    Scene::create(
        conn,
        &track_paul.id,
        10,
        50,
        0,
        "Prologue",
        "A beginning is a very delicate time.",
    )
    .expect("Scene 1 failed");

    // Scene 2: Guild at t=20
    Scene::create(
        conn,
        &track_guild.id,
        20,
        40,
        0,
        "The Guild Navigator",
        "Edric swam in an orange gas tank.",
    )
    .expect("Scene 2 failed");

    // Scene 3: Paul at t=30
    Scene::create(
        conn,
        &track_paul.id,
        30,
        60,
        0,
        "Sietch Tabr",
        "Deep in the desert of Arrakis.",
    )
    .expect("Scene 3 failed");

    let assembled = assemble_project(conn, &project.id).expect("Assembly failed");
    assert_eq!(assembled.len(), 3);

    // 1. Default options: title enabled, metadata disabled, standard separator "* * *"
    let default_options = MarkdownExportOptions::default();
    let golden_md = export_markdown(&project, &assembled, &default_options);

    let expected_golden = "# Dune Messiah\n\nAuthor: Frank Herbert\n\n## Prologue\n\nA beginning is a very delicate time.\n\n* * *\n\n## The Guild Navigator\n\nEdric swam in an orange gas tank.\n\n* * *\n\n## Sietch Tabr\n\nDeep in the desert of Arrakis.\n";

    assert_eq!(
        golden_md, expected_golden,
        "Exported markdown must match expected golden manuscript byte-for-byte"
    );

    // Check count of scene separators
    assert_eq!(golden_md.matches("* * *").count(), 2);

    // 2. Determinism check: 100 iterations byte-for-byte identical
    for _ in 0..100 {
        let repeated = export_markdown(&project, &assembled, &default_options);
        assert_eq!(repeated, golden_md);
    }

    // 3. Option: include_title = false
    let no_title_options = MarkdownExportOptions {
        include_title: false,
        ..Default::default()
    };
    let no_title_md = export_markdown(&project, &assembled, &no_title_options);
    let expected_no_title = "A beginning is a very delicate time.\n\n* * *\n\nEdric swam in an orange gas tank.\n\n* * *\n\nDeep in the desert of Arrakis.\n";
    assert_eq!(no_title_md, expected_no_title);
    assert!(!no_title_md.contains("# Dune Messiah"));
    assert!(!no_title_md.contains("## Prologue"));

    // 4. Option: include_metadata = true
    let metadata_options = MarkdownExportOptions {
        include_metadata: true,
        ..Default::default()
    };
    let metadata_md = export_markdown(&project, &assembled, &metadata_options);
    assert!(metadata_md.contains("> Track: Paul Atreides | Time: 10"));
    assert!(metadata_md.contains("> Track: Guild Navigator | Time: 20"));
    assert!(metadata_md.contains("> Track: Paul Atreides | Time: 30"));

    // 5. Custom scene separator
    let custom_sep_options = MarkdownExportOptions {
        scene_separator: "\n\n---\n\n".to_string(),
        ..Default::default()
    };
    let custom_sep_md = export_markdown(&project, &assembled, &custom_sep_options);
    assert!(custom_sep_md.contains("\n\n---\n\n"));
    assert_eq!(custom_sep_md.matches("---").count(), 2);
    assert_eq!(custom_sep_md.matches("* * *").count(), 0);

    // 6. Empty scenes behavior
    let empty_scenes: Vec<cadence_core::AssembledScene> = Vec::new();
    let empty_with_title = export_markdown(&project, &empty_scenes, &default_options);
    assert_eq!(empty_with_title, "# Dune Messiah\n\nAuthor: Frank Herbert\n");

    let empty_without_title = export_markdown(&project, &empty_scenes, &no_title_options);
    assert_eq!(empty_without_title, "");
}

#[test]
fn test_export_markdown_atomic_file_write() {
    let dir = tempdir().expect("Tempdir failed");
    let file_path = dir.path().join("manuscript.md");

    let db = Database::open_in_memory().expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Atomic Test Story", "Writer").expect("Project failed");
    let track = Track::create(conn, &project.id, "Main", DEFAULT_TRACK_COLOR, 0).expect("Track failed");
    Scene::create(
        conn,
        &track.id,
        0,
        100,
        0,
        "Scene One",
        "The atomic writer wrote carefully.",
    )
    .expect("Scene failed");

    let assembled = assemble_project(conn, &project.id).expect("Assembly failed");
    let options = MarkdownExportOptions::default();

    // 1. Initial write
    export_markdown_to_file(&file_path, &project, &assembled, &options)
        .expect("Atomic write should succeed");

    assert!(file_path.exists(), "Target file must exist after export");
    let content = std::fs::read_to_string(&file_path).expect("Read exported file");
    let expected = export_markdown(&project, &assembled, &options);
    assert_eq!(content, expected);

    // Verify no leftover tmp-export-* files remain in the target directory
    let leftover_tmps: Vec<_> = std::fs::read_dir(dir.path())
        .expect("Read dir")
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .contains("tmp-export")
        })
        .collect();
    assert_eq!(leftover_tmps.len(), 0, "No temporary files should linger");

    // 2. Atomic overwrite
    Scene::create(
        conn,
        &track.id,
        150,
        50,
        0,
        "Scene Two",
        "Overwriting existing manuscript atomically.",
    )
    .expect("Scene 2 failed");
    let assembled_updated = assemble_project(conn, &project.id).expect("Assembly updated failed");

    export_markdown_to_file(&file_path, &project, &assembled_updated, &options)
        .expect("Atomic overwrite should succeed");

    let updated_content = std::fs::read_to_string(&file_path).expect("Read updated file");
    let expected_updated = export_markdown(&project, &assembled_updated, &options);
    assert_eq!(updated_content, expected_updated);
    assert!(updated_content.contains("Scene Two"));

    // 3. Nested non-existent directory creation
    let nested_path = dir.path().join("subfolder").join("nested").join("manuscript.md");
    export_markdown_to_file(&nested_path, &project, &assembled_updated, &options)
        .expect("Nested atomic write should succeed");
    assert!(nested_path.exists(), "Nested target file must exist");
}
