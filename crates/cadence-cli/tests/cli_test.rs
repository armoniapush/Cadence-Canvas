use assert_cmd::Command;
use predicates::prelude::*;
use serde_json::Value;
use tempfile::tempdir;

#[test]
fn test_cli_init_and_tracks() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test_tracks.cadence");
    let db_str = db_path.to_str().unwrap();

    // 1. Initialize project with --json
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args([
            "--json", "init", db_str,
            "--title", "Epic Novel",
            "--author", "A. Writer",
        ])
        .assert()
        .success();

    let output = assert.get_output();
    let init_json: Value = serde_json::from_slice(&output.stdout).expect("Valid JSON from init");
    assert_eq!(init_json["title"], "Epic Novel");
    assert_eq!(init_json["author"], "A. Writer");
    let project_id = init_json["id"].as_str().expect("project id string").to_string();

    // 2. Add Track A
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args([
            "--json", "track", "add", db_str,
            "--project", &project_id,
            "--name", "Protagonist",
            "--color", "#10b981",
            "--order", "0",
        ])
        .assert()
        .success();
    let track_a_json: Value = serde_json::from_slice(&assert.get_output().stdout).expect("Valid JSON track A");
    assert_eq!(track_a_json["name"], "Protagonist");
    assert_eq!(track_a_json["track_order"], 0);
    assert_eq!(track_a_json["is_muted"], false);
    let track_a_id = track_a_json["id"].as_str().unwrap().to_string();

    // 3. Add Track B (order 1)
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args([
        "--json", "track", "add", db_str,
        "--project", &project_id,
        "--name", "Antagonist",
        "--order", "1",
    ])
    .assert()
    .success();

    // 4. List tracks with --json and validate JSON structure
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args(["--json", "track", "list", db_str, "--project", &project_id])
        .assert()
        .success();
    let tracks_json: Value = serde_json::from_slice(&assert.get_output().stdout).expect("Valid JSON track list");
    let tracks_arr = tracks_json.as_array().expect("tracks array");
    assert_eq!(tracks_arr.len(), 2);
    assert_eq!(tracks_arr[0]["name"], "Protagonist");
    assert_eq!(tracks_arr[0]["track_order"], 0);
    assert_eq!(tracks_arr[1]["name"], "Antagonist");
    assert_eq!(tracks_arr[1]["track_order"], 1);

    // 5. Track mute and unmute
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args(["--json", "track", "mute", db_str, "--id", &track_a_id])
        .assert()
        .success();

    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args(["--json", "track", "list", db_str, "--project", &project_id])
        .assert()
        .success();
    let tracks_json: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    assert_eq!(tracks_json[0]["is_muted"], true);

    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args(["--json", "track", "mute", db_str, "--id", &track_a_id, "--unmute"])
        .assert()
        .success();

    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args(["--json", "track", "list", db_str, "--project", &project_id])
        .assert()
        .success();
    let tracks_json: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    assert_eq!(tracks_json[0]["is_muted"], false);
}

#[test]
fn test_cli_scene_lifecycle_and_occ() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("occ_test.cadence");
    let db_str = db_path.to_str().unwrap();

    // 1. Init project
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args(["--json", "init", db_str, "--title", "OCC Project"])
        .assert()
        .success();
    let proj: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    let project_id = proj["id"].as_str().unwrap();

    // 2. Add track
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args([
            "--json", "track", "add", db_str,
            "--project", project_id,
            "--name", "Main Plot",
        ])
        .assert()
        .success();
    let track: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    let track_id = track["id"].as_str().unwrap();

    // 3. Add scene (initial version = 1)
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args([
            "--json", "scene", "add", db_str,
            "--track", track_id,
            "--title", "The Opening",
            "--time", "0",
            "--duration", "10",
            "--text", "In the beginning, the world was silent.",
        ])
        .assert()
        .success();
    let scene: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    assert_eq!(scene["title"], "The Opening");
    assert_eq!(scene["version"], 1);
    assert_eq!(scene["word_count"], 7);
    let scene_id = scene["id"].as_str().unwrap();

    // 4. Edit scene with expected version = 1 (should succeed, version bumps to 2)
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args([
            "--json", "scene", "edit", db_str,
            "--id", scene_id,
            "--version", "1",
            "--title", "The Loud Opening",
            "--text", "In the beginning, thunder roared across the sky.",
        ])
        .assert()
        .success();
    let updated: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    assert_eq!(updated["title"], "The Loud Opening");
    assert_eq!(updated["version"], 2);
    assert_eq!(updated["word_count"], 8);

    // 5. Try to edit scene with old version = 1 (must fail with OCC conflict, exit code 75)
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args([
        "--json", "scene", "edit", db_str,
        "--id", scene_id,
        "--version", "1",
        "--text", "Stale write attempt",
    ])
    .assert()
    .failure()
    .code(75)
    .stderr(predicate::str::contains("conflict").or(predicate::str::contains("Optimistic concurrency conflict")));

    // 6. Verify via get that the scene remains at version 2 and text was unchanged
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args(["--json", "scene", "get", db_str, "--id", scene_id])
        .assert()
        .success();
    let current: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    assert_eq!(current["version"], 2);
    assert_eq!(current["title"], "The Loud Opening");

    // 7. Test scene move with version 2 (should succeed, version bumps to 3)
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    let assert = cmd
        .args([
            "--json", "scene", "move", db_str,
            "--id", scene_id,
            "--version", "2",
            "--track", track_id,
            "--time", "5",
            "--duration", "15",
        ])
        .assert()
        .success();
    let moved: Value = serde_json::from_slice(&assert.get_output().stdout).unwrap();
    assert_eq!(moved["version"], 3);
    assert_eq!(moved["t_start"], 5);
    assert_eq!(moved["duration"], 15);

    // 8. Try to move scene with old version = 2 (must fail with OCC conflict, exit code 75)
    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args([
        "--json", "scene", "move", db_str,
        "--id", scene_id,
        "--version", "2",
        "--track", track_id,
        "--time", "10",
        "--duration", "20",
    ])
    .assert()
    .failure()
    .code(75);
}

#[test]
fn test_cli_human_readable_output() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("human.cadence");
    let db_str = db_path.to_str().unwrap();

    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args(["init", db_str, "--title", "Human Readable Project"])
        .assert()
        .success()
        .stdout(predicate::str::contains("Initialized project 'Human Readable Project'"));

    let mut cmd = Command::cargo_bin("cadence").unwrap();
    cmd.args(["project", "list", db_str])
        .assert()
        .success()
        .stdout(predicate::str::contains("Human Readable Project"));
}
