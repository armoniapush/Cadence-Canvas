use cadence_core::{
    retry_on_conflict, CadenceError, Database, Project, Scene, Track, DEFAULT_TRACK_COLOR,
};

#[test]
fn test_scene_lifecycle_and_word_counts() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    // 1. Setup project and tracks
    let project = Project::create(conn, "Hyperion Cantos", "Dan Simmons")
        .expect("Project creation failed");
    let track_a = Track::create(conn, &project.id, "The Priest's Tale", DEFAULT_TRACK_COLOR, 0)
        .expect("Track A creation failed");
    let track_b = Track::create(conn, &project.id, "The Soldier's Tale", "#10b981", 1)
        .expect("Track B creation failed");

    // 2. Create scene and verify automatic word and character count calculation
    let initial_text = "The river was quiet. The trees whispered ancient secrets.";
    // 9 words, 57 chars
    let scene = Scene::create(
        conn,
        &track_a.id,
        0,
        150,
        0,
        "The Forest River",
        initial_text,
    )
    .expect("Scene creation failed");

    assert!(!scene.id.is_empty(), "Scene ID should be a non-empty UUID");
    assert_eq!(scene.track_id, track_a.id);
    assert_eq!(scene.t_start, 0);
    assert_eq!(scene.duration, 150);
    assert_eq!(scene.z_index, 0);
    assert_eq!(scene.title, "The Forest River");
    assert_eq!(scene.text, initial_text);
    assert_eq!(scene.word_count, 9);
    assert_eq!(scene.char_count, 57);
    assert_eq!(scene.version, 1);
    assert!(scene.created_at > 0);
    assert_eq!(scene.created_at, scene.updated_at);

    // 3. Fetch scene by ID
    let fetched = Scene::get_by_id(conn, &scene.id).expect("Failed to fetch scene by id");
    assert_eq!(fetched, scene);

    // 4. Update scene content (OCC with version 1 -> 2)
    let updated_text = "The Shrike emerged from the valley of the Time Tombs, metallic thorns glistening.";
    // 13 words, 81 chars
    let updated = Scene::update_content(
        conn,
        &scene.id,
        1,
        "Valley of the Time Tombs",
        updated_text,
    )
    .expect("Failed to update scene content");

    assert_eq!(updated.id, scene.id);
    assert_eq!(updated.version, 2);
    assert_eq!(updated.title, "Valley of the Time Tombs");
    assert_eq!(updated.text, updated_text);
    assert_eq!(updated.word_count, 13);
    assert_eq!(updated.char_count, 81);
    assert!(updated.updated_at >= scene.created_at);

    // 5. Create additional scenes across tracks to test listing
    let scene_a2 = Scene::create(
        conn,
        &track_a.id,
        150,
        200,
        0,
        "The River Rapids",
        "Fast currents.",
    )
    .expect("Scene A2 creation failed");

    let scene_b1 = Scene::create(
        conn,
        &track_b.id,
        50,
        100,
        0,
        "Simulation Combat",
        "Virtual war.",
    )
    .expect("Scene B1 creation failed");

    // 6. Test list_by_track
    let track_a_scenes = Scene::list_by_track(conn, &track_a.id).expect("Failed to list track A scenes");
    assert_eq!(track_a_scenes.len(), 2);
    assert_eq!(track_a_scenes[0].id, scene.id);
    assert_eq!(track_a_scenes[1].id, scene_a2.id);

    // 7. Test list_by_project (ordered by track_order ASC, t_start ASC)
    let all_scenes = Scene::list_by_project(conn, &project.id).expect("Failed to list project scenes");
    assert_eq!(all_scenes.len(), 3);
    assert_eq!(all_scenes[0].id, scene.id);
    assert_eq!(all_scenes[1].id, scene_a2.id);
    assert_eq!(all_scenes[2].id, scene_b1.id);

    // 8. Move scene coordinates (OCC with version 2 preserved)
    let moved = Scene::move_coordinates(conn, &scene.id, 2, &track_b.id, 300, 180)
        .expect("Failed to move scene coordinates");
    assert_eq!(moved.id, scene.id);
    assert_eq!(moved.track_id, track_b.id);
    assert_eq!(moved.t_start, 300);
    assert_eq!(moved.duration, 180);
    assert_eq!(moved.version, 2);

    // 9. Delete scene and verify non-existence
    Scene::delete(conn, &scene_a2.id).expect("Failed to delete scene A2");
    assert!(matches!(
        Scene::get_by_id(conn, &scene_a2.id),
        Err(CadenceError::NotFound(_))
    ));
    assert!(matches!(
        Scene::delete(conn, &scene_a2.id),
        Err(CadenceError::NotFound(_))
    ));
}

#[test]
fn test_optimistic_concurrency_locking() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Solaris", "Stanislaw Lem")
        .expect("Project creation failed");
    let track = Track::create(conn, &project.id, "Station", DEFAULT_TRACK_COLOR, 0)
        .expect("Track creation failed");

    let scene = Scene::create(
        conn,
        &track.id,
        0,
        100,
        0,
        "Arrival",
        "Kris Kelvin arrives at Solaris station.",
    )
    .expect("Scene creation failed");

    assert_eq!(scene.version, 1);

    // 1. Attempt mutation with stale expected_version (e.g. 99 instead of 1)
    let stale_content_res = Scene::update_content(
        conn,
        &scene.id,
        99,
        "New Arrival",
        "Stale content mutation.",
    );

    match stale_content_res {
        Err(CadenceError::StaleMutationConflict { id, expected, actual }) => {
            assert_eq!(id, scene.id);
            assert_eq!(expected, 99);
            assert_eq!(actual, 1);
        }
        other => panic!("Expected StaleMutationConflict, got {:?}", other),
    }

    // 2. Legitimate mutation with expected_version = 1 increments version to 2
    let updated = Scene::update_content(
        conn,
        &scene.id,
        1,
        "Arrival at Solaris",
        "Kris Kelvin docks with the research station.",
    )
    .expect("Legitimate update should succeed");

    assert_eq!(updated.version, 2);

    // 3. Previous expected_version (1) is now stale; verify move_coordinates fails
    let stale_move_res = Scene::move_coordinates(conn, &scene.id, 1, &track.id, 10, 120);

    match stale_move_res {
        Err(CadenceError::StaleMutationConflict { id, expected, actual }) => {
            assert_eq!(id, scene.id);
            assert_eq!(expected, 1);
            assert_eq!(actual, 2);
        }
        other => panic!("Expected StaleMutationConflict, got {:?}", other),
    }

    // 4. Move coordinates with valid expected_version = 2 preserves version = 2
    let moved = Scene::move_coordinates(conn, &scene.id, 2, &track.id, 10, 120)
        .expect("Legitimate move should succeed");
    assert_eq!(moved.version, 2);

    // 5. Updating or moving a non-existent scene returns NotFound, NOT StaleMutationConflict
    let not_found_update = Scene::update_content(
        conn,
        "00000000-0000-0000-0000-000000000000",
        1,
        "Ghost Scene",
        "Ghost text",
    );
    assert!(
        matches!(not_found_update, Err(CadenceError::NotFound(_))),
        "Non-existent scene update must return NotFound"
    );

    let not_found_move = Scene::move_coordinates(
        conn,
        "00000000-0000-0000-0000-000000000000",
        1,
        &track.id,
        0,
        100,
    );
    assert!(
        matches!(not_found_move, Err(CadenceError::NotFound(_))),
        "Non-existent scene move must return NotFound"
    );

    // 6. Verify retry_on_conflict helper
    let mut retry_count = 0;
    let retry_res = retry_on_conflict(3, || {
        retry_count += 1;
        if retry_count < 3 {
            Err(CadenceError::StaleMutationConflict {
                id: scene.id.clone(),
                expected: 2,
                actual: 3,
            })
        } else {
            Scene::get_by_id(conn, &scene.id)
        }
    });
    assert!(retry_res.is_ok());
    assert_eq!(retry_count, 3);
}

#[test]
fn test_spatial_invariants_rejected() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Neuromancer", "William Gibson")
        .expect("Project creation failed");
    let track = Track::create(conn, &project.id, "Chiba City", DEFAULT_TRACK_COLOR, 0)
        .expect("Track creation failed");

    // 1. Invariant: Scene title cannot be empty or whitespace only
    let empty_title_res = Scene::create(conn, &track.id, 0, 100, 0, "", "The sky was television...");
    assert!(
        matches!(empty_title_res, Err(CadenceError::Validation(_))),
        "Empty scene title must be rejected with Validation error"
    );

    let ws_title_res = Scene::create(conn, &track.id, 0, 100, 0, "   \t\n  ", "The sky was television...");
    assert!(
        matches!(ws_title_res, Err(CadenceError::Validation(_))),
        "Whitespace scene title must be rejected with Validation error"
    );

    // 2. Invariant: t_start cannot be negative (< 0)
    let neg_t_res = Scene::create(conn, &track.id, -1, 100, 0, "Night City", "Case was in the bar.");
    assert!(
        matches!(neg_t_res, Err(CadenceError::Validation(_))),
        "Negative t_start must be rejected with Validation error"
    );

    // 3. Invariant: duration must be positive (> 0)
    let zero_dur_res = Scene::create(conn, &track.id, 0, 0, 0, "Zero Duration", "Instant event.");
    assert!(
        matches!(zero_dur_res, Err(CadenceError::Validation(_))),
        "Zero duration must be rejected with Validation error"
    );

    let neg_dur_res = Scene::create(conn, &track.id, 0, -20, 0, "Negative Duration", "Time travel.");
    assert!(
        matches!(neg_dur_res, Err(CadenceError::Validation(_))),
        "Negative duration must be rejected with Validation error"
    );

    // 4. Create valid scene to test rejection on update / move
    let scene = Scene::create(conn, &track.id, 0, 100, 0, "The Matrix", "Console cowboy.")
        .expect("Valid scene creation failed");

    // 5. Invariant rejection on update_content (empty title)
    let empty_title_update = Scene::update_content(conn, &scene.id, 1, "   ", "Updated text.");
    assert!(
        matches!(empty_title_update, Err(CadenceError::Validation(_))),
        "Updating scene with empty title must be rejected with Validation error"
    );

    // 6. Invariant rejection on move_coordinates (negative t_start or duration <= 0)
    let neg_t_move = Scene::move_coordinates(conn, &scene.id, 1, &track.id, -10, 100);
    assert!(
        matches!(neg_t_move, Err(CadenceError::Validation(_))),
        "Moving scene to negative t_start must be rejected with Validation error"
    );

    let zero_dur_move = Scene::move_coordinates(conn, &scene.id, 1, &track.id, 0, 0);
    assert!(
        matches!(zero_dur_move, Err(CadenceError::Validation(_))),
        "Moving scene to zero duration must be rejected with Validation error"
    );

    let neg_dur_move = Scene::move_coordinates(conn, &scene.id, 1, &track.id, 0, -15);
    assert!(
        matches!(neg_dur_move, Err(CadenceError::Validation(_))),
        "Moving scene to negative duration must be rejected with Validation error"
    );
}

#[test]
fn test_foreign_key_track_enforced() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Rendezvous with Rama", "Arthur C. Clarke")
        .expect("Project creation failed");

    // 1. Attempt to create scene referencing non-existent track
    let orphan_res = Scene::create(
        conn,
        "00000000-0000-0000-0000-000000000000",
        0,
        100,
        0,
        "First Approach",
        "The survey ship Endeavour approaches Rama.",
    );

    assert!(
        matches!(orphan_res, Err(CadenceError::Storage(_))),
        "Scene referencing non-existent track must fail with SQLite foreign key Storage error"
    );
    if let Err(CadenceError::Storage(err)) = orphan_res {
        let err_str = err.to_string().to_lowercase();
        assert!(
            err_str.contains("foreign key"),
            "Error must explicitly mention foreign key constraint failure, got: {err}"
        );
    }

    // 2. Create valid track and scene
    let track = Track::create(conn, &project.id, "Endeavour Crew", DEFAULT_TRACK_COLOR, 0)
        .expect("Track creation failed");
    let scene = Scene::create(
        conn,
        &track.id,
        0,
        100,
        0,
        "Inside Rama",
        "Captain Norton enters the cylindrical world.",
    )
    .expect("Scene creation failed");

    // 3. Attempt to move scene to non-existent track_id
    let invalid_move_res = Scene::move_coordinates(
        conn,
        &scene.id,
        1,
        "00000000-0000-0000-0000-000000000000",
        50,
        100,
    );
    assert!(
        matches!(invalid_move_res, Err(CadenceError::Storage(_))),
        "Moving scene to non-existent track must fail with foreign key Storage error"
    );
    if let Err(CadenceError::Storage(err)) = invalid_move_res {
        let err_str = err.to_string().to_lowercase();
        assert!(
            err_str.contains("foreign key"),
            "Error must explicitly mention foreign key constraint failure, got: {err}"
        );
    }

    // 4. Verify ON DELETE RESTRICT on tracks: Deleting track with active scene MUST fail
    let delete_track_res = Track::delete(conn, &track.id);
    assert!(
        matches!(delete_track_res, Err(CadenceError::Storage(_))),
        "Deleting track with active scenes must be blocked by ON DELETE RESTRICT"
    );
    if let Err(CadenceError::Storage(err)) = delete_track_res {
        let err_str = err.to_string().to_lowercase();
        assert!(
            err_str.contains("foreign key"),
            "Error must explicitly mention foreign key constraint failure, got: {err}"
        );
    }
}
