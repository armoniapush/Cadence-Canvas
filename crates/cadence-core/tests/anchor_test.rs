use cadence_core::{
    assemble_project, compute_topological_ranks, CadenceError, Database, Project, ReadingAnchor,
    Scene, Track, DEFAULT_TRACK_COLOR,
};

#[test]
fn test_anchor_creation_and_listing() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Solaris", "Stanislaw Lem").expect("Project creation failed");
    let track = Track::create(conn, &project.id, "Station", DEFAULT_TRACK_COLOR, 0).expect("Track creation failed");

    let scene_a = Scene::create(conn, &track.id, 0, 100, 0, "Arrival", "Kelvin arrives at station.")
        .expect("Scene A creation failed");
    let scene_b = Scene::create(conn, &track.id, 100, 100, 0, "Ocean", "The sentient ocean swirls.")
        .expect("Scene B creation failed");

    // 1. Create valid reading anchor
    let anchor = ReadingAnchor::create(conn, &project.id, &scene_a.id, &scene_b.id, "chronological", 1.0)
        .expect("Anchor creation failed");

    assert!(!anchor.id.is_empty());
    assert_eq!(anchor.project_id, project.id);
    assert_eq!(anchor.source_scene_id, scene_a.id);
    assert_eq!(anchor.target_scene_id, scene_b.id);
    assert_eq!(anchor.anchor_type, "chronological");
    assert_eq!(anchor.weight, 1.0);
    assert!(anchor.created_at > 0);

    // 2. Fetch anchor by id
    let fetched = ReadingAnchor::get_by_id(conn, &anchor.id).expect("Fetch anchor failed");
    assert_eq!(fetched, anchor);

    // 3. List anchors by project
    let list = ReadingAnchor::list_by_project(conn, &project.id).expect("List anchors failed");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].id, anchor.id);

    // 4. Delete anchor
    ReadingAnchor::delete(conn, &anchor.id).expect("Delete anchor failed");
    let list_after = ReadingAnchor::list_by_project(conn, &project.id).expect("List anchors after delete failed");
    assert!(list_after.is_empty());

    let deleted_fetch = ReadingAnchor::get_by_id(conn, &anchor.id);
    assert!(matches!(deleted_fetch, Err(CadenceError::NotFound(_))));
}

#[test]
fn test_anchor_self_reference_rejected() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Ouroboros", "Author").expect("Project creation failed");
    let track = Track::create(conn, &project.id, "Main", DEFAULT_TRACK_COLOR, 0).expect("Track creation failed");
    let scene_a = Scene::create(conn, &track.id, 0, 100, 0, "Self Loop", "Text").expect("Scene creation failed");

    let res = ReadingAnchor::create(conn, &project.id, &scene_a.id, &scene_a.id, "causal", 1.0);
    assert!(
        matches!(res, Err(CadenceError::Validation(_))),
        "Self-referencing anchor must be rejected with Validation error, got: {res:?}"
    );
}

#[test]
fn test_anchor_direct_cycle_rejected() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Bootstrap Paradox", "Author").expect("Project creation failed");
    let track = Track::create(conn, &project.id, "Main", DEFAULT_TRACK_COLOR, 0).expect("Track creation failed");

    let scene_a = Scene::create(conn, &track.id, 0, 100, 0, "Past", "Text").expect("Scene A creation failed");
    let scene_b = Scene::create(conn, &track.id, 100, 100, 0, "Future", "Text").expect("Scene B creation failed");

    // A -> B
    ReadingAnchor::create(conn, &project.id, &scene_a.id, &scene_b.id, "causal", 1.0)
        .expect("Anchor A -> B creation failed");

    // B -> A must be rejected as direct cycle
    let res = ReadingAnchor::create(conn, &project.id, &scene_b.id, &scene_a.id, "causal", 1.0);
    match res {
        Err(CadenceError::CyclicAnchor { ref from, ref to }) => {
            assert_eq!(from, &scene_b.id);
            assert_eq!(to, &scene_a.id);
        }
        other => panic!("Expected CyclicAnchor error, got {other:?}"),
    }
}

#[test]
fn test_anchor_transitive_cycle_rejected() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Grandfather Paradox", "Author").expect("Project creation failed");
    let track = Track::create(conn, &project.id, "Main", DEFAULT_TRACK_COLOR, 0).expect("Track creation failed");

    let scene_a = Scene::create(conn, &track.id, 0, 100, 0, "A", "Text").expect("Scene A creation failed");
    let scene_b = Scene::create(conn, &track.id, 100, 100, 0, "B", "Text").expect("Scene B creation failed");
    let scene_c = Scene::create(conn, &track.id, 200, 100, 0, "C", "Text").expect("Scene C creation failed");

    // A -> B and B -> C
    ReadingAnchor::create(conn, &project.id, &scene_a.id, &scene_b.id, "causal", 1.0)
        .expect("A -> B failed");
    ReadingAnchor::create(conn, &project.id, &scene_b.id, &scene_c.id, "causal", 1.0)
        .expect("B -> C failed");

    // C -> A must be rejected as transitive cycle
    let res = ReadingAnchor::create(conn, &project.id, &scene_c.id, &scene_a.id, "causal", 1.0);
    match res {
        Err(CadenceError::CyclicAnchor { ref from, ref to }) => {
            assert_eq!(from, &scene_c.id);
            assert_eq!(to, &scene_a.id);
        }
        other => panic!("Expected CyclicAnchor error, got {other:?}"),
    }
}

#[test]
fn test_anchor_affects_sweep_order() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Non-Linear Narrative", "Pulp Fiction").expect("Project failed");
    let track = Track::create(conn, &project.id, "Gold Watch", DEFAULT_TRACK_COLOR, 0).expect("Track failed");

    // Create scene_1 and scene_2 with IDENTICAL t_start, track, z_index
    let scene_1 = Scene::create(conn, &track.id, 50, 100, 0, "Scene Alpha", "Text 1").expect("Scene 1 failed");
    let scene_2 = Scene::create(conn, &track.id, 50, 100, 0, "Scene Beta", "Text 2").expect("Scene 2 failed");

    // Before anchors: verify initial assembled order
    let initial_assembled = assemble_project(conn, &project.id).expect("Assemble failed");
    assert_eq!(initial_assembled.len(), 2);
    assert!(initial_assembled.iter().any(|s| s.scene.id == scene_1.id));
    assert!(initial_assembled.iter().any(|s| s.scene.id == scene_2.id));
    let first_id = initial_assembled[0].scene.id.clone();
    let second_id = initial_assembled[1].scene.id.clone();

    // Now introduce an anchor that forces the naturally second scene to precede the naturally first scene:
    // second_id -> first_id
    ReadingAnchor::create(conn, &project.id, &second_id, &first_id, "flashback", 1.0)
        .expect("Anchor creation failed");

    // Assemble again: anchor DAG must reverse/reorder them deterministically!
    let reordered_assembled = assemble_project(conn, &project.id).expect("Reordered assemble failed");
    assert_eq!(reordered_assembled.len(), 2);
    assert_eq!(
        reordered_assembled[0].scene.id, second_id,
        "Anchor source (second_id) must now be assembled FIRST because anchor_topo = 0 < 1"
    );
    assert_eq!(
        reordered_assembled[1].scene.id, first_id,
        "Anchor target (first_id) must now be assembled SECOND because anchor_topo = 1"
    );
}

#[test]
fn test_topological_ranks_diamond_and_disconnected() {
    let a = ReadingAnchor {
        id: "1".into(),
        project_id: "p".into(),
        source_scene_id: "A".into(),
        target_scene_id: "B".into(),
        anchor_type: "causal".into(),
        weight: 1.0,
        created_at: 100,
    };
    let b = ReadingAnchor {
        id: "2".into(),
        project_id: "p".into(),
        source_scene_id: "A".into(),
        target_scene_id: "C".into(),
        anchor_type: "causal".into(),
        weight: 1.0,
        created_at: 101,
    };
    let c = ReadingAnchor {
        id: "3".into(),
        project_id: "p".into(),
        source_scene_id: "B".into(),
        target_scene_id: "D".into(),
        anchor_type: "causal".into(),
        weight: 1.0,
        created_at: 102,
    };
    let d = ReadingAnchor {
        id: "4".into(),
        project_id: "p".into(),
        source_scene_id: "C".into(),
        target_scene_id: "D".into(),
        anchor_type: "causal".into(),
        weight: 1.0,
        created_at: 103,
    };

    let anchors = vec![a, b, c, d];
    let ranks = compute_topological_ranks(&anchors);

    assert_eq!(ranks.get("A"), Some(&0));
    assert_eq!(ranks.get("B"), Some(&1));
    assert_eq!(ranks.get("C"), Some(&1));
    assert_eq!(ranks.get("D"), Some(&2));

    // Empty anchors
    let empty_ranks = compute_topological_ranks(&[]);
    assert!(empty_ranks.is_empty());
}
