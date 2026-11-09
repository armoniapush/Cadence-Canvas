use cadence_core::{CadenceError, Database, Project, Track, DEFAULT_TRACK_COLOR};

#[test]
fn test_project_lifecycle() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    // 1. Create project
    let project = Project::create(conn, "Chronicles of Dune", "Frank Herbert")
        .expect("Project creation failed");

    assert!(!project.id.is_empty(), "Project ID should be a non-empty UUID");
    assert_eq!(project.title, "Chronicles of Dune");
    assert_eq!(project.author, "Frank Herbert");
    assert!(project.created_at > 0);
    assert_eq!(project.created_at, project.updated_at);
    assert_eq!(project.meta_json, "{}");

    // 2. Read project by ID
    let fetched = Project::get_by_id(conn, &project.id)
        .expect("Failed to fetch project by id");
    assert_eq!(fetched, project);

    // 3. Create a second project
    let project2 = Project::create(conn, "Dune Messiah", "Frank Herbert")
        .expect("Second project creation failed");

    // 4. List all projects (ordered by created_at)
    let projects = Project::list(conn).expect("Failed to list projects");
    assert_eq!(projects.len(), 2);
    assert_eq!(projects[0].id, project.id);
    assert_eq!(projects[1].id, project2.id);

    // 5. Delete project2
    Project::delete(conn, &project2.id).expect("Failed to delete project");
    let remaining = Project::list(conn).expect("Failed to list projects after delete");
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].id, project.id);

    // 6. Query non-existent project returns NotFound
    let not_found = Project::get_by_id(conn, &project2.id);
    assert!(
        matches!(not_found, Err(CadenceError::NotFound(_))),
        "Expected NotFound error for deleted project"
    );
}

#[test]
fn test_track_lifecycle_and_ordering() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Hyperion Cantos", "Dan Simmons")
        .expect("Project creation failed");

    // 1. Create tracks in deliberate non-sequential order
    let track_c = Track::create(conn, &project.id, "Consul Tale", "#3b82f6", 2)
        .expect("Track C creation failed");
    let track_a = Track::create(conn, &project.id, "Priest Tale", DEFAULT_TRACK_COLOR, 0)
        .expect("Track A creation failed");
    let track_b = Track::create(conn, &project.id, "Soldier Tale", "#10b981", 1)
        .expect("Track B creation failed");

    // 2. List tracks and verify ascending order by track_order (0, 1, 2)
    let tracks = Track::list_by_project(conn, &project.id)
        .expect("Failed to list tracks by project");
    assert_eq!(tracks.len(), 3);
    assert_eq!(tracks[0].id, track_a.id);
    assert_eq!(tracks[0].track_order, 0);
    assert_eq!(tracks[0].name, "Priest Tale");
    assert_eq!(tracks[0].is_muted, false);

    assert_eq!(tracks[1].id, track_b.id);
    assert_eq!(tracks[1].track_order, 1);
    assert_eq!(tracks[1].name, "Soldier Tale");
    assert_eq!(tracks[1].is_muted, false);

    assert_eq!(tracks[2].id, track_c.id);
    assert_eq!(tracks[2].track_order, 2);
    assert_eq!(tracks[2].name, "Consul Tale");
    assert_eq!(tracks[2].is_muted, false);

    // 3. Toggle muting (set_muted to true, then back to false)
    Track::set_muted(conn, &track_b.id, true).expect("Failed to mute track B");
    let muted_b = Track::get_by_id(conn, &track_b.id).expect("Failed to get track B");
    assert!(muted_b.is_muted, "Track B should now be muted");

    Track::set_muted(conn, &track_b.id, false).expect("Failed to unmute track B");
    let unmuted_b = Track::get_by_id(conn, &track_b.id).expect("Failed to get track B");
    assert!(!unmuted_b.is_muted, "Track B should now be unmuted");

    // 4. Update order index
    Track::update_order(conn, &track_c.id, 0).expect("Failed to update track C order");
    let reordered_c = Track::get_by_id(conn, &track_c.id).expect("Failed to get track C");
    assert_eq!(reordered_c.track_order, 0);

    // 5. Non-existent track operations return NotFound
    assert!(matches!(
        Track::get_by_id(conn, "missing-track"),
        Err(CadenceError::NotFound(_))
    ));
    assert!(matches!(
        Track::set_muted(conn, "missing-track", true),
        Err(CadenceError::NotFound(_))
    ));
    assert!(matches!(
        Track::update_order(conn, "missing-track", 1),
        Err(CadenceError::NotFound(_))
    ));
}

#[test]
fn test_causal_invariants_rejected() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    // 1. Invariant: Project title cannot be empty or whitespace
    let empty_title_res = Project::create(conn, "", "Author");
    assert!(
        matches!(empty_title_res, Err(CadenceError::Validation(_))),
        "Empty project title must be rejected with CadenceError::Validation"
    );

    let whitespace_title_res = Project::create(conn, "   \t\n  ", "Author");
    assert!(
        matches!(whitespace_title_res, Err(CadenceError::Validation(_))),
        "Whitespace-only project title must be rejected with CadenceError::Validation"
    );

    // Create a valid project for subsequent track invariant tests
    let project = Project::create(conn, "Foundation", "Isaac Asimov")
        .expect("Failed to create valid project");

    // 2. Invariant: Track name cannot be empty or whitespace
    let empty_name_res = Track::create(conn, &project.id, "", DEFAULT_TRACK_COLOR, 0);
    assert!(
        matches!(empty_name_res, Err(CadenceError::Validation(_))),
        "Empty track name must be rejected with CadenceError::Validation"
    );

    let whitespace_name_res = Track::create(conn, &project.id, "   ", DEFAULT_TRACK_COLOR, 0);
    assert!(
        matches!(whitespace_name_res, Err(CadenceError::Validation(_))),
        "Whitespace track name must be rejected with CadenceError::Validation"
    );

    // 3. Invariant: Track color_hex cannot be empty or whitespace
    let empty_color_res = Track::create(conn, &project.id, "Terminus", "", 0);
    assert!(
        matches!(empty_color_res, Err(CadenceError::Validation(_))),
        "Empty color_hex must be rejected with CadenceError::Validation"
    );

    let whitespace_color_res = Track::create(conn, &project.id, "Terminus", "   ", 0);
    assert!(
        matches!(whitespace_color_res, Err(CadenceError::Validation(_))),
        "Whitespace color_hex must be rejected with CadenceError::Validation"
    );

    // 4. Invariant: Track order cannot be negative (< 0)
    let neg_order_res = Track::create(conn, &project.id, "Trantor", DEFAULT_TRACK_COLOR, -1);
    assert!(
        matches!(neg_order_res, Err(CadenceError::Validation(_))),
        "Negative track_order must be rejected with CadenceError::Validation"
    );

    // 5. Invariant: Update order to negative must also fail validation
    let valid_track = Track::create(conn, &project.id, "Galactic Empire", DEFAULT_TRACK_COLOR, 0)
        .expect("Valid track creation failed");
    let update_neg_res = Track::update_order(conn, &valid_track.id, -5);
    assert!(
        matches!(update_neg_res, Err(CadenceError::Validation(_))),
        "Updating track_order to negative must be rejected with CadenceError::Validation"
    );

    // 6. Invariant: Foreign key constraint (non-existent project_id) must be rejected by SQLite
    let orphan_track_res = Track::create(
        conn,
        "00000000-0000-0000-0000-000000000000",
        "Orphan Track",
        DEFAULT_TRACK_COLOR,
        0,
    );
    assert!(
        matches!(orphan_track_res, Err(CadenceError::Storage(_))),
        "Track for non-existent project_id must fail with foreign key Storage error"
    );
    if let Err(CadenceError::Storage(err)) = orphan_track_res {
        let err_str = err.to_string().to_lowercase();
        assert!(
            err_str.contains("foreign key"),
            "Error must explicitly mention foreign key constraint failure, got: {err}"
        );
    }
}
