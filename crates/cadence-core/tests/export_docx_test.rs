use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::tempdir;

use cadence_core::{
    assemble_project, export_docx, export_docx_to_file, Database, DocxExportOptions, Project,
    Scene, Track, DEFAULT_TRACK_COLOR,
};

#[test]
fn test_export_docx_valid_zip_and_structure() {
    let db = Database::open_in_memory().expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "The Dispossessed", "Ursula K. Le Guin")
        .expect("Project failed");

    let track_anarres = Track::create(conn, &project.id, "Anarres", DEFAULT_TRACK_COLOR, 0)
        .expect("Track failed");
    let track_urras = Track::create(conn, &project.id, "Urras", "#3b82f6", 1)
        .expect("Track failed");

    // Scene 1: Anarres t=0
    Scene::create(
        conn,
        &track_anarres.id,
        0,
        100,
        0,
        "Chapter 1 - Anarres",
        "There was a wall. It did not look important.\n\nIt was built of unmortared rocks.",
    )
    .expect("Scene 1 failed");

    // Scene 2: Urras t=100
    Scene::create(
        conn,
        &track_urras.id,
        100,
        80,
        0,
        "Chapter 2 - Urras",
        "The spaceport was vast and gleaming under the alien sun.",
    )
    .expect("Scene 2 failed");

    let assembled = assemble_project(conn, &project.id).expect("Assembly failed");
    assert_eq!(assembled.len(), 2);

    // 1. Default options export
    let default_options = DocxExportOptions::default();
    let docx_bytes = export_docx(&project, &assembled, &default_options)
        .expect("DOCX export should succeed");

    // Verify ZIP magic number (PK\x03\x04)
    assert!(docx_bytes.len() > 100, "DOCX buffer must not be empty");
    assert_eq!(
        &docx_bytes[0..4],
        b"PK\x03\x04",
        "DOCX file must start with standard ZIP local file header PK\\x03\\x04"
    );

    // Read back and parse document structure using docx-rs reader
    let read_doc = docx_rs::read_docx(&docx_bytes).expect("Exported docx must be parsed by docx_rs");
    assert!(
        !read_doc.document.children.is_empty(),
        "Exported document must have content elements"
    );

    // 2. Export with title disabled
    let no_title_opts = DocxExportOptions {
        include_title: false,
        ..Default::default()
    };
    let no_title_bytes = export_docx(&project, &assembled, &no_title_opts)
        .expect("DOCX export without title should succeed");
    assert_eq!(&no_title_bytes[0..4], b"PK\x03\x04");
    docx_rs::read_docx(&no_title_bytes).expect("Parsed no-title docx");

    // 3. Export with metadata enabled and custom font/size/separator
    let custom_opts = DocxExportOptions {
        include_title: true,
        include_metadata: true,
        scene_separator: "* * *".to_string(),
        font_family: "Times New Roman".to_string(),
        font_size: 28,
    };
    let custom_bytes = export_docx(&project, &assembled, &custom_opts)
        .expect("DOCX export with custom options should succeed");
    assert_eq!(&custom_bytes[0..4], b"PK\x03\x04");
    docx_rs::read_docx(&custom_bytes).expect("Parsed custom docx");

    // 4. Empty scenes export
    let empty_scenes: Vec<cadence_core::AssembledScene> = Vec::new();
    let empty_bytes = export_docx(&project, &empty_scenes, &default_options)
        .expect("Empty scenes export should produce valid docx");
    assert_eq!(&empty_bytes[0..4], b"PK\x03\x04");
    docx_rs::read_docx(&empty_bytes).expect("Parsed empty scenes docx");
}

#[test]
fn test_export_docx_atomic_file_write() {
    let dir = tempdir().expect("Tempdir failed");
    let file_path = dir.path().join("manuscript.docx");

    let db = Database::open_in_memory().expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Atomic Docx Story", "Test Author")
        .expect("Project failed");
    let track = Track::create(conn, &project.id, "Main", DEFAULT_TRACK_COLOR, 0)
        .expect("Track failed");
    Scene::create(
        conn,
        &track.id,
        0,
        50,
        0,
        "Scene 1",
        "Writing atomic docx to disk safely.",
    )
    .expect("Scene failed");

    let assembled = assemble_project(conn, &project.id).expect("Assembly failed");
    let options = DocxExportOptions::default();

    // 1. Initial atomic write
    export_docx_to_file(&file_path, &project, &assembled, &options)
        .expect("export_docx_to_file should succeed");

    assert!(file_path.exists(), "Target docx must exist on disk");
    let content = std::fs::read(&file_path).expect("Read exported docx");
    assert_eq!(&content[0..4], b"PK\x03\x04");
    docx_rs::read_docx(&content).expect("Read docx from file");

    // Verify zero leftover temporary files in target directory
    let leftovers: Vec<_> = std::fs::read_dir(dir.path())
        .expect("Read dir")
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().contains("tmp-export-docx"))
        .collect();
    assert_eq!(leftovers.len(), 0, "No temp files should remain after atomic write");

    // 2. Atomic overwrite
    Scene::create(
        conn,
        &track.id,
        60,
        40,
        0,
        "Scene 2",
        "Overwriting existing docx manuscript atomically.",
    )
    .expect("Scene 2 failed");
    let assembled_updated = assemble_project(conn, &project.id).expect("Assembly updated failed");

    export_docx_to_file(&file_path, &project, &assembled_updated, &options)
        .expect("Atomic overwrite should succeed");

    let updated_content = std::fs::read(&file_path).expect("Read updated docx");
    assert_eq!(&updated_content[0..4], b"PK\x03\x04");
    docx_rs::read_docx(&updated_content).expect("Read updated docx from file");

    // 3. Nested non-existent directory creation
    let nested_path = dir.path().join("deep").join("nested").join("manuscript.docx");
    export_docx_to_file(&nested_path, &project, &assembled_updated, &options)
        .expect("Nested atomic write should succeed");
    assert!(nested_path.exists(), "Nested docx target file must exist");
}

#[test]
fn test_cli_export_docx() {
    let dir = tempdir().expect("Tempdir failed");
    let db_path = dir.path().join("cli_export.cadence");
    let db_str = db_path.to_str().expect("valid path str");
    let out_docx = dir.path().join("output.docx");
    let out_str = out_docx.to_str().expect("valid out str");

    // Setup project and scene via CLI
    let mut cmd = Command::cargo_bin("cadence").expect("Find cadence binary");
    let init_res = cmd
        .args([
            "--json", "init", db_str,
            "--title", "Docx CLI Novel",
            "--author", "CLI Author",
        ])
        .assert()
        .success();
    let init_json: serde_json::Value =
        serde_json::from_slice(&init_res.get_output().stdout).expect("Valid JSON");
    let project_id = init_json["id"].as_str().expect("id").to_string();

    let mut cmd = Command::cargo_bin("cadence").expect("Find cadence binary");
    let track_res = cmd
        .args([
            "--json", "track", "add", db_str,
            "--project", &project_id,
            "--name", "Protagonist",
        ])
        .assert()
        .success();
    let track_json: serde_json::Value =
        serde_json::from_slice(&track_res.get_output().stdout).expect("Valid JSON");
    let track_id = track_json["id"].as_str().expect("id").to_string();

    let mut cmd = Command::cargo_bin("cadence").expect("Find cadence binary");
    cmd.args([
        "--json", "scene", "add", db_str,
        "--track", &track_id,
        "--title", "Act One",
        "--time", "0",
        "--duration", "100",
        "--text", "In the beginning was the typed word.",
    ])
    .assert()
    .success();

    // 1. Test CLI export docx with --json
    let mut cmd = Command::cargo_bin("cadence").expect("Find cadence binary");
    let export_res = cmd
        .args([
            "--json", "export", "docx", db_str,
            "--project", &project_id,
            "--output", out_str,
        ])
        .assert()
        .success();

    let export_json: serde_json::Value =
        serde_json::from_slice(&export_res.get_output().stdout).expect("Valid JSON");
    assert_eq!(export_json["status"], "ok");
    assert_eq!(export_json["format"], "docx");
    assert_eq!(export_json["project_id"], project_id);
    assert_eq!(export_json["scene_count"], 1);
    assert!(export_json["bytes_written"].as_u64().expect("bytes") > 0);

    // Verify written file
    assert!(out_docx.exists());
    let file_bytes = std::fs::read(&out_docx).expect("Read output docx");
    assert_eq!(&file_bytes[0..4], b"PK\x03\x04");
    docx_rs::read_docx(&file_bytes).expect("Verify docx structure");

    // 2. Test human-readable CLI output
    let human_out = dir.path().join("human_export.docx");
    let human_str = human_out.to_str().expect("valid path");
    let mut cmd = Command::cargo_bin("cadence").expect("Find cadence binary");
    cmd.args([
        "export", "docx", db_str,
        "--project", &project_id,
        "--output", human_str,
    ])
    .assert()
    .success()
    .stdout(predicate::str::contains("Exported 1 scenes to"));

    assert!(human_out.exists());

    // 3. Test non-existent project returns error
    let mut cmd = Command::cargo_bin("cadence").expect("Find cadence binary");
    cmd.args([
        "export", "docx", db_str,
        "--project", "non-existent-uuid",
        "--output", human_str,
    ])
    .assert()
    .failure()
    .stderr(predicate::str::contains("not found"));
}
