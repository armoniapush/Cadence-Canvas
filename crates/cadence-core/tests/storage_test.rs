use cadence_core::Database;
use tempfile::tempdir;

#[test]
fn test_database_open_new_and_reopen() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("test_project.cadence");

    // 1. Create and populate initial state
    {
        let db = Database::open(&db_path).expect("Failed to create new database");
        let conn = db.conn();

        conn.execute(
            "INSERT INTO projects (id, title, author, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ("proj-1", "Test Novel", "Author Name", 1700000000, 1700000000),
        ).expect("Failed to insert project");

        let integrity = db.integrity_check().expect("Integrity check failed");
        assert_eq!(integrity, "ok");
    }

    // 2. Re-open existing database and verify data integrity
    {
        let db = Database::open(&db_path).expect("Failed to re-open database");
        let conn = db.conn();

        let (title, author): (String, String) = conn
            .query_row(
                "SELECT title, author FROM projects WHERE id = ?1",
                ["proj-1"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("Failed to read project from re-opened database");

        assert_eq!(title, "Test Novel");
        assert_eq!(author, "Author Name");

        let integrity = db.integrity_check().expect("Integrity check failed on reopened db");
        assert_eq!(integrity, "ok");
    }
}

#[test]
fn test_pragmas_configured_correctly() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("test_pragmas.cadence");

    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    // Verify journal_mode is WAL
    let journal_mode: String = conn
        .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
        .expect("Failed to query journal_mode");
    assert_eq!(journal_mode.to_lowercase(), "wal");

    // Verify foreign_keys is ON (1)
    let foreign_keys: i32 = conn
        .query_row("PRAGMA foreign_keys;", [], |row| row.get(0))
        .expect("Failed to query foreign_keys");
    assert_eq!(foreign_keys, 1);

    // Verify busy_timeout is 5000
    let busy_timeout: i32 = conn
        .query_row("PRAGMA busy_timeout;", [], |row| row.get(0))
        .expect("Failed to query busy_timeout");
    assert_eq!(busy_timeout, 5000);

    // Verify synchronous is NORMAL (1)
    let synchronous: i32 = conn
        .query_row("PRAGMA synchronous;", [], |row| row.get(0))
        .expect("Failed to query synchronous");
    assert_eq!(synchronous, 1);
}

#[test]
fn test_schema_integrity_check() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("test_integrity.cadence");

    let db = Database::open(&db_path).expect("Failed to open database");
    let integrity = db.integrity_check().expect("Integrity check failed");
    assert_eq!(integrity, "ok");
}

#[test]
fn test_foreign_keys_cascade_and_restrict() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("test_fk.cadence");

    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    // 1. Verify foreign key violation on inserting orphan track
    let orphan_track_res = conn.execute(
        "INSERT INTO tracks (id, project_id, name, track_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        ("track-orphan", "non-existent-proj", "A-Plot", 0, 1000),
    );
    assert!(orphan_track_res.is_err(), "Inserting orphan track should violate foreign key constraint");

    // 2. Insert valid project and track
    conn.execute(
        "INSERT INTO projects (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        ("proj-1", "Novel Alpha", 1000, 1000),
    ).expect("Insert project failed");

    conn.execute(
        "INSERT INTO tracks (id, project_id, name, track_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        ("track-1", "proj-1", "Main Plot", 0, 1000),
    ).expect("Insert track failed");

    // 3. Insert scene referencing track-1
    conn.execute(
        "INSERT INTO scenes (id, track_id, t_start, duration, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        ("scene-1", "track-1", 0, 100, "Opening", 1000, 1000),
    ).expect("Insert scene failed");

    // 4. Verify RESTRICT: Attempting to delete track-1 while scene-1 exists MUST fail
    let delete_track_res = conn.execute("DELETE FROM tracks WHERE id = ?1", ["track-1"]);
    assert!(
        delete_track_res.is_err(),
        "Deleting track with attached scenes must be blocked by ON DELETE RESTRICT"
    );

    // 5. Delete scene-1, then verify CASCADE: Deleting project-1 must cascade-delete track-1
    conn.execute("DELETE FROM scenes WHERE id = ?1", ["scene-1"]).expect("Failed to delete scene");

    conn.execute("DELETE FROM projects WHERE id = ?1", ["proj-1"]).expect("Failed to delete project");

    let track_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tracks WHERE id = ?1", ["track-1"], |row| row.get(0))
        .expect("Query track count failed");
    assert_eq!(track_count, 0, "Track should have been cascade-deleted when project was deleted");
}
