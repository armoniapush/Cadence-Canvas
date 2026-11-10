use cadence_core::{
    assemble_project, assemble_scenes, CadenceError, Database, Project, Scene, SceneSweepKey, Track,
    DEFAULT_TRACK_COLOR,
};

#[test]
fn test_sweep_key_lexicographical_tie_breaking() {
    // 1. t_start dominates
    let k1 = SceneSweepKey {
        t_start: 10,
        track_order: 5,
        anchor_topo: 5,
        z_index: 5,
        created_at: 500,
        scene_id: "z".to_string(),
    };
    let k2 = SceneSweepKey {
        t_start: 20,
        track_order: 0,
        anchor_topo: 0,
        z_index: 0,
        created_at: 100,
        scene_id: "a".to_string(),
    };
    assert!(k1 < k2);

    // 2. track_order breaks tie when t_start is equal
    let k3 = SceneSweepKey {
        t_start: 10,
        track_order: 0,
        anchor_topo: 10,
        z_index: 10,
        created_at: 900,
        scene_id: "z".to_string(),
    };
    let k4 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 0,
        z_index: 0,
        created_at: 100,
        scene_id: "a".to_string(),
    };
    assert!(k3 < k4);

    // 3. anchor_topo breaks tie when t_start and track_order are equal
    let k5 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 1,
        z_index: 10,
        created_at: 900,
        scene_id: "z".to_string(),
    };
    let k6 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 0,
        created_at: 100,
        scene_id: "a".to_string(),
    };
    assert!(k5 < k6);

    // 4. z_index breaks tie when earlier fields are equal
    let k7 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 0,
        created_at: 900,
        scene_id: "z".to_string(),
    };
    let k8 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 3,
        created_at: 100,
        scene_id: "a".to_string(),
    };
    assert!(k7 < k8);

    // 5. created_at breaks tie when spatial fields are equal
    let k9 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 3,
        created_at: 100,
        scene_id: "z".to_string(),
    };
    let k10 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 3,
        created_at: 200,
        scene_id: "a".to_string(),
    };
    assert!(k9 < k10);

    // 6. scene_id breaks total tie when all timestamp/spatial attributes match
    let k11 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 3,
        created_at: 100,
        scene_id: "scene-alpha".to_string(),
    };
    let k12 = SceneSweepKey {
        t_start: 10,
        track_order: 1,
        anchor_topo: 2,
        z_index: 3,
        created_at: 100,
        scene_id: "scene-beta".to_string(),
    };
    assert!(k11 < k12);
}

#[test]
fn test_sweep_deterministic_tie_breaking() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Dune Messiah", "Frank Herbert").expect("Project failed");

    // Two tracks: Order 0 and Order 1
    let track_main = Track::create(conn, &project.id, "Paul Atreides", DEFAULT_TRACK_COLOR, 0)
        .expect("Track main failed");
    let track_side = Track::create(conn, &project.id, "Bene Gesserit", "#10b981", 1)
        .expect("Track side failed");

    // Insert scenes with collisions:
    // Scene E: t_start 50 (earliest)
    let s_e = Scene::create(conn, &track_main.id, 50, 100, 0, "Early Vision", "Intro text")
        .expect("Scene creation failed");

    // Scenes at t_start 100:
    // s_a: Track 0, z_index 0
    let s_a = Scene::create(conn, &track_main.id, 100, 50, 0, "Council Meeting", "Text A")
        .expect("Scene creation failed");

    // s_b: Track 0, z_index 5
    let s_b = Scene::create(conn, &track_main.id, 100, 50, 5, "Council Flashback", "Text B")
        .expect("Scene creation failed");

    // s_c: Track 1, z_index 0
    let s_c = Scene::create(conn, &track_side.id, 100, 50, 0, "Conspiracy Room", "Text C")
        .expect("Scene creation failed");

    // s_d: Track 1, z_index 2
    let s_d = Scene::create(conn, &track_side.id, 100, 50, 2, "Secret Message", "Text D")
        .expect("Scene creation failed");

    // Scene F: t_start 200 (latest)
    let s_f = Scene::create(conn, &track_side.id, 200, 100, 0, "Stone Burner", "Climax text")
        .expect("Scene creation failed");

    let assembled = assemble_project(conn, &project.id).expect("Assembly failed");

    assert_eq!(assembled.len(), 6);

    // Expected order: s_e -> s_a -> s_b -> s_c -> s_d -> s_f
    let expected_ids = vec![
        s_e.id.as_str(),
        s_a.id.as_str(),
        s_b.id.as_str(),
        s_c.id.as_str(),
        s_d.id.as_str(),
        s_f.id.as_str(),
    ];

    let actual_ids: Vec<&str> = assembled.iter().map(|a| a.scene.id.as_str()).collect();
    assert_eq!(actual_ids, expected_ids);

    // Verify sequence indices are strictly contiguous 0..N
    for (i, item) in assembled.iter().enumerate() {
        assert_eq!(item.sequence_index, i);
    }

    // Now verify in-memory assemble_scenes produces the exact same deterministic result
    // regardless of the input slice ordering (shuffling / reversing)
    let tracks = vec![track_side.clone(), track_main.clone()];
    let all_scenes = vec![
        s_f.clone(),
        s_b.clone(),
        s_d.clone(),
        s_a.clone(),
        s_e.clone(),
        s_c.clone(),
    ];

    let assembled_shuffled = assemble_scenes(all_scenes, &tracks);
    let shuffled_ids: Vec<&str> = assembled_shuffled
        .iter()
        .map(|a| a.scene.id.as_str())
        .collect();
    assert_eq!(shuffled_ids, expected_ids);
}

#[test]
fn test_sweep_filters_muted_tracks() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Neuromancer", "William Gibson").expect("Project failed");

    let track_active = Track::create(conn, &project.id, "Case", DEFAULT_TRACK_COLOR, 0)
        .expect("Track active failed");
    let track_muted = Track::create(conn, &project.id, "Molly", "#ec4899", 1)
        .expect("Track muted failed");

    let s1 = Scene::create(conn, &track_active.id, 10, 50, 0, "Chiba City", "Night city")
        .expect("Scene s1 failed");
    let s2 = Scene::create(conn, &track_muted.id, 20, 50, 0, "Mirror Shades", "Stealth")
        .expect("Scene s2 failed");
    let s3 = Scene::create(conn, &track_active.id, 30, 50, 0, "The Matrix", "Cyberspace")
        .expect("Scene s3 failed");

    // Initially neither track is muted
    let assembled_all = assemble_project(conn, &project.id).expect("Assembly failed");
    assert_eq!(assembled_all.len(), 3);

    // Mute track_muted
    Track::set_muted(conn, &track_muted.id, true).expect("Failed to mute track");

    let assembled = assemble_project(conn, &project.id).expect("Assembly failed");
    assert_eq!(assembled.len(), 2);
    assert_eq!(assembled[0].scene.id, s1.id);
    assert_eq!(assembled[0].sequence_index, 0);
    assert_eq!(assembled[1].scene.id, s3.id);
    assert_eq!(assembled[1].sequence_index, 1);

    // Verify s2 (on muted track) is completely absent
    assert!(assembled.iter().all(|a| a.scene.id != s2.id));

    // Unmute track_muted and mute track_active
    Track::set_muted(conn, &track_muted.id, false).expect("Failed to unmute");
    Track::set_muted(conn, &track_active.id, true).expect("Failed to mute active");

    let assembled_swapped = assemble_project(conn, &project.id).expect("Assembly failed");
    assert_eq!(assembled_swapped.len(), 1);
    assert_eq!(assembled_swapped[0].scene.id, s2.id);
    assert_eq!(assembled_swapped[0].sequence_index, 0);
}

#[test]
fn test_sweep_500_scenes_collision_determinism() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    let project = Project::create(conn, "Collision Stress Test", "Tester").expect("Project failed");

    let track_0 = Track::create(conn, &project.id, "Track Zero", DEFAULT_TRACK_COLOR, 0)
        .expect("Track 0 failed");
    let track_1 = Track::create(conn, &project.id, "Track One", "#10b981", 1)
        .expect("Track 1 failed");

    let mut scene_ids = Vec::with_capacity(500);

    // Insert 500 scenes with high collision frequency on t_start, track, and z_index
    for i in 0..500 {
        let t_start = (i % 25) * 10; // Collisions across 25 timestamps
        let track_id = if i % 2 == 0 {
            &track_0.id
        } else {
            &track_1.id
        };
        let z_index = i % 5;
        let title = format!("Scene {i}");
        let text = format!("Content for scene number {i}");

        let scene = Scene::create(conn, track_id, t_start, 50, z_index, &title, &text)
            .expect("Scene creation failed");
        scene_ids.push(scene.id);
    }

    // Baseline assembly
    let baseline = assemble_project(conn, &project.id).expect("Baseline assembly failed");
    assert_eq!(baseline.len(), 500);

    let baseline_ids: Vec<String> = baseline.iter().map(|a| a.scene.id.clone()).collect();

    // Verify all sequence indices are 0..500
    for (idx, item) in baseline.iter().enumerate() {
        assert_eq!(item.sequence_index, idx);
    }

    // Fetch raw scenes and tracks for in-memory re-testing
    let raw_scenes = Scene::list_by_project(conn, &project.id).expect("List scenes failed");
    let tracks = vec![track_1.clone(), track_0.clone()];

    // Run 50 iterations with differently permuted input arrays
    for step in 1..=50 {
        let mut permuted = raw_scenes.clone();
        // Deterministic pseudo-shuffle based on step
        permuted.sort_by(|a, b| {
            let hash_a = (a.title.len() * step + a.t_start as usize * 17) % 31;
            let hash_b = (b.title.len() * step + b.t_start as usize * 17) % 31;
            hash_a.cmp(&hash_b).then_with(|| a.id.cmp(&b.id))
        });

        let test_assembled = assemble_scenes(permuted, &tracks);
        let test_ids: Vec<String> = test_assembled.iter().map(|a| a.scene.id.clone()).collect();

        assert_eq!(
            test_ids, baseline_ids,
            "Assembly at step {step} deviated from deterministic baseline"
        );
    }
}

#[test]
fn test_sweep_empty_project_or_not_found() {
    let db = Database::open_in_memory().expect("Failed to open in-memory database");
    let conn = db.conn();

    // Non-existent project returns NotFound
    let result = assemble_project(conn, "non-existent-uuid");
    match result {
        Err(CadenceError::NotFound(msg)) => {
            assert!(msg.contains("non-existent-uuid"));
        }
        other => panic!("Expected CadenceError::NotFound, got {other:?}"),
    }

    // Existing project with no scenes returns empty vector
    let project = Project::create(conn, "Empty Story", "Ghost Writer").expect("Project failed");
    let assembled_empty = assemble_project(conn, &project.id).expect("Assembly should succeed");
    assert!(assembled_empty.is_empty());
}
