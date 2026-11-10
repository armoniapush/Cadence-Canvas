use cadence_core::{
    audit_temporal_causality, extract_entity_ego_graph, scan_known_mentions, sync_scene_mentions,
    Database, EntityType, LoreEntity, Project, Scene, Track, DEFAULT_TRACK_COLOR,
};
use tempfile::tempdir;

#[test]
fn test_extract_entity_ego_graph_co_occurrences() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("ego_graph.cadence");
    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Chronicles of Eldoria", "Author")
        .expect("Failed to create project");
    let track = Track::create(conn, &project.id, "Main Plot", DEFAULT_TRACK_COLOR, 0)
        .expect("Failed to create track");

    // 1. Insert 3 entities: Alice (Character), Bob (Character), Citadel (Location)
    let alice = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Character,
        "Alice",
        &[],
        Some("#3b82f6"),
    )
    .expect("Create Alice");

    let bob = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Character,
        "Bob",
        &[],
        Some("#6366f1"),
    )
    .expect("Create Bob");

    let citadel = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Location,
        "Citadel",
        &[],
        Some("#10b981"),
    )
    .expect("Create Citadel");

    let all_entities = LoreEntity::list_by_project(conn, &project.id).expect("List entities");

    // 2. Create scenes with co-occurrences:
    // Scene 1: Alice, Bob, and Citadel (all 3 co-occur)
    let s1 = Scene::create(
        conn,
        &track.id,
        10,
        15,
        0,
        "Council Meeting",
        "@Alice meets with @Bob at the #Citadel gates.",
    )
    .expect("Create Scene 1");
    let m1 = scan_known_mentions(&s1.text, &all_entities);
    sync_scene_mentions(conn, &s1.id, &m1).expect("Sync mentions S1");

    // Scene 2: Alice and Bob co-occur again
    let s2 = Scene::create(
        conn,
        &track.id,
        30,
        20,
        0,
        "Secret Alliance",
        "@Alice whispers a plan to @Bob in the dark.",
    )
    .expect("Create Scene 2");
    let m2 = scan_known_mentions(&s2.text, &all_entities);
    sync_scene_mentions(conn, &s2.id, &m2).expect("Sync mentions S2");

    // Scene 3: Citadel alone (Alice is absent)
    let s3 = Scene::create(
        conn,
        &track.id,
        60,
        10,
        0,
        "Citadel Solitude",
        "The sun rises quietly over #Citadel.",
    )
    .expect("Create Scene 3");
    let m3 = scan_known_mentions(&s3.text, &all_entities);
    sync_scene_mentions(conn, &s3.id, &m3).expect("Sync mentions S3");

    // 3. Extract 1-hop ego-graph for Alice
    let ego = extract_entity_ego_graph(conn, &project.id, &alice.id)
        .expect("Extract Alice ego graph");

    // Verify Center Node
    assert_eq!(ego.center.id, alice.id);
    assert_eq!(ego.center.name, "Alice");
    assert_eq!(ego.center.entity_type, EntityType::Character);
    assert_eq!(ego.center.color_hex, "#3b82f6");
    assert_eq!(ego.center.mention_count, 2); // Mentioned in s1 and s2

    // Verify Neighbors: Bob and Citadel
    assert_eq!(ego.neighbors.len(), 2);

    let bob_node = ego
        .neighbors
        .iter()
        .find(|n| n.id == bob.id)
        .expect("Bob should be a neighbor");
    assert_eq!(bob_node.name, "Bob");
    assert_eq!(bob_node.entity_type, EntityType::Character);
    assert_eq!(bob_node.mention_count, 2);

    let citadel_node = ego
        .neighbors
        .iter()
        .find(|n| n.id == citadel.id)
        .expect("Citadel should be a neighbor");
    assert_eq!(citadel_node.name, "Citadel");
    assert_eq!(citadel_node.entity_type, EntityType::Location);
    assert_eq!(citadel_node.mention_count, 2); // Mentioned in s1 and s3

    // Verify Edges & Weights
    assert_eq!(ego.edges.len(), 2);

    // Edge Alice -> Bob: Co-occurred in 2 scenes (s1, s2) -> weight = 2.0
    let edge_bob = ego
        .edges
        .iter()
        .find(|e| e.target_id == bob.id)
        .expect("Edge to Bob");
    assert_eq!(edge_bob.source_id, alice.id);
    assert_eq!(edge_bob.weight, 2.0);
    assert_eq!(edge_bob.relation_type, "co_occurrence");

    // Edge Alice -> Citadel: Co-occurred in 1 scene (s1) -> weight = 1.0
    let edge_citadel = ego
        .edges
        .iter()
        .find(|e| e.target_id == citadel.id)
        .expect("Edge to Citadel");
    assert_eq!(edge_citadel.source_id, alice.id);
    assert_eq!(edge_citadel.weight, 1.0);
    assert_eq!(edge_citadel.relation_type, "co_occurrence");
}

#[test]
fn test_temporal_validator_catches_anachronisms() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("validator_anachronism.cadence");
    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Temporal Anachronism Test", "Auditor")
        .expect("Failed to create project");
    let track = Track::create(conn, &project.id, "Timeline", DEFAULT_TRACK_COLOR, 0)
        .expect("Failed to create track");

    // 1. Insert entity with born_at = 100 and died_at = 200
    let merlin = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Character,
        "Merlin",
        &[],
        None,
    )
    .expect("Create Merlin");

    LoreEntity::update_meta(conn, &merlin.id, r#"{"born_at": 100, "died_at": 200}"#)
        .expect("Update Merlin lifespan");

    let all_entities = LoreEntity::list_by_project(conn, &project.id).expect("List entities");

    // 2. Scene at t=50 (before birth at 100)
    let s_past = Scene::create(
        conn,
        &track.id,
        50,
        10,
        0,
        "Primordial Era",
        "@Merlin speaks before time began.",
    )
    .expect("Create scene past");
    let m_past = scan_known_mentions(&s_past.text, &all_entities);
    sync_scene_mentions(conn, &s_past.id, &m_past).expect("Sync mentions past");

    // 3. Scene at t=250 (after demise at 200)
    let s_future = Scene::create(
        conn,
        &track.id,
        250,
        10,
        0,
        "Post-Apocalypse",
        "@Merlin appears among the ruins long after death.",
    )
    .expect("Create scene future");
    let m_future = scan_known_mentions(&s_future.text, &all_entities);
    sync_scene_mentions(conn, &s_future.id, &m_future).expect("Sync mentions future");

    // 4. Audit temporal causality
    let issues = audit_temporal_causality(conn, &project.id)
        .expect("Audit temporal causality");

    assert_eq!(issues.len(), 2, "Expected exactly 2 anachronism issues");

    // Pre-birth anachronism check
    let pre_birth = issues
        .iter()
        .find(|i| i.issue_type == "pre_birth_mention")
        .expect("Pre-birth issue should be present");
    assert_eq!(pre_birth.scene_id, s_past.id);
    assert_eq!(pre_birth.scene_title, "Primordial Era");
    assert_eq!(pre_birth.scene_time, 50);
    assert_eq!(pre_birth.entity_id, merlin.id);
    assert_eq!(pre_birth.entity_name, "Merlin");
    assert!(
        pre_birth.message.contains("before birth/origin at 100"),
        "Message should report birth boundary: {}",
        pre_birth.message
    );

    // Post-mortem anachronism check
    let post_mortem = issues
        .iter()
        .find(|i| i.issue_type == "post_mortem_mention")
        .expect("Post-mortem issue should be present");
    assert_eq!(post_mortem.scene_id, s_future.id);
    assert_eq!(post_mortem.scene_title, "Post-Apocalypse");
    assert_eq!(post_mortem.scene_time, 250);
    assert_eq!(post_mortem.entity_id, merlin.id);
    assert_eq!(post_mortem.entity_name, "Merlin");
    assert!(
        post_mortem.message.contains("after demise/death at 200"),
        "Message should report death boundary: {}",
        post_mortem.message
    );
}

#[test]
fn test_temporal_validator_clean_on_valid_timeline() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("validator_valid.cadence");
    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Valid Timeline Test", "Auditor")
        .expect("Failed to create project");
    let track = Track::create(conn, &project.id, "Timeline", DEFAULT_TRACK_COLOR, 0)
        .expect("Failed to create track");

    // Entity with lifespan [100..200]
    let king = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Character,
        "King Arthur",
        &[],
        None,
    )
    .expect("Create King Arthur");

    LoreEntity::update_meta(conn, &king.id, r#"{"born_at": 100, "died_at": 200}"#)
        .expect("Update lifespan");

    let all_entities = LoreEntity::list_by_project(conn, &project.id).expect("List entities");

    // Scenes strictly within [100..200]
    let s_birth = Scene::create(
        conn,
        &track.id,
        100,
        10,
        0,
        "Coronation Day",
        "@King Arthur takes the throne.",
    )
    .expect("Create coronation");
    sync_scene_mentions(
        conn,
        &s_birth.id,
        &scan_known_mentions(&s_birth.text, &all_entities),
    )
    .expect("Sync coronation");

    let s_mid = Scene::create(
        conn,
        &track.id,
        150,
        15,
        0,
        "Golden Reign",
        "@King Arthur presides over peace.",
    )
    .expect("Create golden reign");
    sync_scene_mentions(
        conn,
        &s_mid.id,
        &scan_known_mentions(&s_mid.text, &all_entities),
    )
    .expect("Sync reign");

    let s_death = Scene::create(
        conn,
        &track.id,
        200,
        5,
        0,
        "Final Battle",
        "@King Arthur falls in battle.",
    )
    .expect("Create final battle");
    sync_scene_mentions(
        conn,
        &s_death.id,
        &scan_known_mentions(&s_death.text, &all_entities),
    )
    .expect("Sync final battle");

    // Audit should report zero issues
    let issues = audit_temporal_causality(conn, &project.id)
        .expect("Audit temporal causality");

    assert!(
        issues.is_empty(),
        "Expected 0 issues for valid timeline, found: {:?}",
        issues
    );
}
