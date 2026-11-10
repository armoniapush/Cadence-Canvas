use cadence_core::{
    scan_all_candidates, scan_known_mentions, scan_untracked_candidates, sync_scene_mentions,
    Database, EntityType, LoreEntity, MentionScanner, Project, Scene, Track,
};
use tempfile::tempdir;

#[test]
fn test_lore_entity_lifecycle_and_aliases() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("test_entities.cadence");
    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "The Silver Kingdom", "A. R. Mon")
        .expect("Failed to create project");

    // 1. Create entities with aliases and custom colors
    let aria = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Character,
        "Aria",
        &["Shadowblade", "The Whisper"],
        Some("#3b82f6"),
    )
    .expect("Failed to create character");

    let citadel = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Location,
        "Citadel",
        &["The High Keep"],
        Some("#10b981"),
    )
    .expect("Failed to create location");

    let relic = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Item,
        "Relic",
        &["Sunstone"],
        None,
    )
    .expect("Failed to create item");

    // 2. List by project (alphabetical order)
    let list = LoreEntity::list_by_project(conn, &project.id).expect("Failed to list entities");
    assert_eq!(list.len(), 3);
    assert_eq!(list[0].name, "Aria");
    assert_eq!(list[1].name, "Citadel");
    assert_eq!(list[2].name, "Relic");

    // 3. Get by id
    let retrieved_aria = LoreEntity::get_by_id(conn, &aria.id).expect("Failed to get Aria");
    assert_eq!(retrieved_aria.name, "Aria");
    assert_eq!(retrieved_aria.entity_type, EntityType::Character);
    assert_eq!(retrieved_aria.aliases, vec!["Shadowblade", "The Whisper"]);
    assert_eq!(retrieved_aria.color_hex, "#3b82f6");

    // 4. Find by name or alias (with or without prefix, case-insensitive)
    let found_name = LoreEntity::find_by_name_or_alias(conn, &project.id, "aria")
        .expect("Find failed")
        .expect("Entity not found");
    assert_eq!(found_name.id, aria.id);

    let found_prefixed = LoreEntity::find_by_name_or_alias(conn, &project.id, "@Aria")
        .expect("Find failed")
        .expect("Entity not found");
    assert_eq!(found_prefixed.id, aria.id);

    let found_alias = LoreEntity::find_by_name_or_alias(conn, &project.id, "Shadowblade")
        .expect("Find failed")
        .expect("Entity not found");
    assert_eq!(found_alias.id, aria.id);

    let found_alias_prefixed = LoreEntity::find_by_name_or_alias(conn, &project.id, "@The Whisper")
        .expect("Find failed")
        .expect("Entity not found");
    assert_eq!(found_alias_prefixed.id, aria.id);

    let found_loc_alias = LoreEntity::find_by_name_or_alias(conn, &project.id, "#The High Keep")
        .expect("Find failed")
        .expect("Entity not found");
    assert_eq!(found_loc_alias.id, citadel.id);

    let not_found = LoreEntity::find_by_name_or_alias(conn, &project.id, "@NonExistent")
        .expect("Find failed");
    assert!(not_found.is_none());

    // 5. Delete entity
    let deleted = LoreEntity::delete(conn, &relic.id).expect("Failed to delete entity");
    assert!(deleted);
    assert_eq!(
        LoreEntity::list_by_project(conn, &project.id)
            .expect("List failed")
            .len(),
        2
    );
    assert!(LoreEntity::get_by_id(conn, &relic.id).is_err());
}

#[test]
fn test_aho_corasick_known_mention_extraction() {
    let aria = LoreEntity {
        id: "ent-aria".into(),
        project_id: "p1".into(),
        entity_type: EntityType::Character,
        name: "Aria".into(),
        aliases: vec!["Shadowblade".into()],
        color_hex: "#3b82f6".into(),
        meta_json: "{}".into(),
        created_at: 100,
        updated_at: 100,
    };
    let citadel = LoreEntity {
        id: "ent-citadel".into(),
        project_id: "p1".into(),
        entity_type: EntityType::Location,
        name: "Citadel".into(),
        aliases: vec![],
        color_hex: "#10b981".into(),
        meta_json: "{}".into(),
        created_at: 100,
        updated_at: 100,
    };
    let relic = LoreEntity {
        id: "ent-relic".into(),
        project_id: "p1".into(),
        entity_type: EntityType::Item,
        name: "Relic".into(),
        aliases: vec![],
        color_hex: "#f59e0b".into(),
        meta_json: "{}".into(),
        created_at: 100,
        updated_at: 100,
    };

    let entities = vec![aria.clone(), citadel.clone(), relic.clone()];
    let text = "Inside the deep walls of #Citadel, @Aria wielded the ancient !Relic with precision.";

    let mentions = scan_known_mentions(text, &entities);
    assert_eq!(mentions.len(), 3);

    // 1. #Citadel
    let m0 = &mentions[0];
    assert_eq!(m0.prefix, '#');
    assert_eq!(m0.matched_text, "#Citadel");
    assert_eq!(m0.entity_id, Some("ent-citadel".into()));
    let expected_citadel_start = text.find("#Citadel").unwrap();
    assert_eq!(m0.start, expected_citadel_start);
    assert_eq!(m0.end, expected_citadel_start + "#Citadel".len());

    // 2. @Aria
    let m1 = &mentions[1];
    assert_eq!(m1.prefix, '@');
    assert_eq!(m1.matched_text, "@Aria");
    assert_eq!(m1.entity_id, Some("ent-aria".into()));
    let expected_aria_start = text.find("@Aria").unwrap();
    assert_eq!(m1.start, expected_aria_start);
    assert_eq!(m1.end, expected_aria_start + "@Aria".len());

    // 3. !Relic
    let m2 = &mentions[2];
    assert_eq!(m2.prefix, '!');
    assert_eq!(m2.matched_text, "!Relic");
    assert_eq!(m2.entity_id, Some("ent-relic".into()));
    let expected_relic_start = text.find("!Relic").unwrap();
    assert_eq!(m2.start, expected_relic_start);
    assert_eq!(m2.end, expected_relic_start + "!Relic".len());

    // Alias extraction test
    let text_alias = "The rogue known as @Shadowblade returned safely.";
    let alias_mentions = scan_known_mentions(text_alias, &entities);
    assert_eq!(alias_mentions.len(), 1);
    assert_eq!(alias_mentions[0].matched_text, "@Shadowblade");
    assert_eq!(alias_mentions[0].entity_id, Some("ent-aria".into()));

    // Boundary rejection test (no false positives)
    let negative_text = "Contact user@Aria.com or check #CitadelLonger or yell !";
    let neg_mentions = scan_known_mentions(negative_text, &entities);
    assert_eq!(neg_mentions.len(), 0);
}

#[test]
fn test_untracked_candidate_extraction() {
    let aria = LoreEntity {
        id: "ent-aria".into(),
        project_id: "p1".into(),
        entity_type: EntityType::Character,
        name: "Aria".into(),
        aliases: vec![],
        color_hex: "#3b82f6".into(),
        meta_json: "{}".into(),
        created_at: 100,
        updated_at: 100,
    };

    let text = "While @Aria observed, @UnknownLord entered #ForgottenCrypt holding !DoomsdayDevice.";

    // 1. Scan all candidates in text
    let all = scan_all_candidates(text);
    assert_eq!(all.len(), 4);
    assert_eq!(all[0].matched_text, "@Aria");
    assert_eq!(all[0].token, "Aria");
    assert_eq!(all[0].prefix, '@');

    assert_eq!(all[1].matched_text, "@UnknownLord");
    assert_eq!(all[1].token, "UnknownLord");
    assert_eq!(all[1].prefix, '@');

    assert_eq!(all[2].matched_text, "#ForgottenCrypt");
    assert_eq!(all[2].token, "ForgottenCrypt");
    assert_eq!(all[2].prefix, '#');

    assert_eq!(all[3].matched_text, "!DoomsdayDevice");
    assert_eq!(all[3].token, "DoomsdayDevice");
    assert_eq!(all[3].prefix, '!');

    // 2. Scan untracked candidates (filters out known @Aria)
    let untracked = scan_untracked_candidates(text, &[aria]);
    assert_eq!(untracked.len(), 3);
    assert_eq!(untracked[0].token, "UnknownLord");
    assert_eq!(untracked[1].token, "ForgottenCrypt");
    assert_eq!(untracked[2].token, "DoomsdayDevice");
}

#[test]
fn test_sync_scene_mentions_persistence() {
    let dir = tempdir().expect("Failed to create temporary directory");
    let db_path = dir.path().join("test_mentions_persistence.cadence");
    let db = Database::open(&db_path).expect("Failed to open database");
    let conn = db.conn();

    let project = Project::create(conn, "Chronicles", "Author").expect("Project create");
    let track = Track::create(conn, &project.id, "Main Plot", "#6366f1", 0).expect("Track create");
    let scene = Scene::create(
        conn,
        &track.id,
        0,
        100,
        0,
        "Meeting at Citadel",
        "At #Citadel, @Aria claimed the !Relic.",
    )
    .expect("Scene create");

    let aria = LoreEntity::create(conn, &project.id, EntityType::Character, "Aria", &[], None)
        .expect("Aria create");
    let citadel =
        LoreEntity::create(conn, &project.id, EntityType::Location, "Citadel", &[], None)
            .expect("Citadel create");
    let relic = LoreEntity::create(conn, &project.id, EntityType::Item, "Relic", &[], None)
        .expect("Relic create");

    let entities = vec![aria.clone(), citadel.clone(), relic.clone()];
    let mentions = scan_known_mentions(&scene.text, &entities);
    assert_eq!(mentions.len(), 3);

    // 1. Sync mentions to database
    sync_scene_mentions(conn, &scene.id, &mentions).expect("Failed to sync mentions");

    // 2. Count mentions via scanner helper and direct SQL
    let count = MentionScanner::count_scene_mentions(conn, &scene.id).expect("Count failed");
    assert_eq!(count, 3);

    let sql_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM scene_entity_mentions WHERE scene_id = ?1",
            [&scene.id],
            |row| row.get(0),
        )
        .expect("SQL count query failed");
    assert_eq!(sql_count, 3);

    // 3. Retrieve and verify persisted mention details
    let loaded =
        MentionScanner::get_scene_mentions(conn, &scene.id).expect("Failed to get mentions");
    assert_eq!(loaded.len(), 3);
    assert_eq!(loaded[0].matched_text, "#Citadel");
    assert_eq!(loaded[0].entity_id, Some(citadel.id));
    assert_eq!(loaded[1].matched_text, "@Aria");
    assert_eq!(loaded[1].entity_id, Some(aria.id));
    assert_eq!(loaded[2].matched_text, "!Relic");
    assert_eq!(loaded[2].entity_id, Some(relic.id));

    // 4. Idempotent / re-sync behavior: replace with subset
    let single_mention = vec![mentions[0].clone()];
    sync_scene_mentions(conn, &scene.id, &single_mention).expect("Re-sync failed");
    assert_eq!(
        MentionScanner::count_scene_mentions(conn, &scene.id).expect("Count failed"),
        1
    );

    // 5. Cascade delete with scene
    conn.execute("DELETE FROM scenes WHERE id = ?1", [&scene.id])
        .expect("Delete scene failed");
    assert_eq!(
        MentionScanner::count_scene_mentions(conn, &scene.id).expect("Count after delete"),
        0
    );
}

#[test]
fn test_gate4_aho_corasick_high_throughput() {
    // Gate 4: Extracción de menciones para 1.000 entidades en 10.000 palabras
    let mut entities = Vec::with_capacity(1000);
    for i in 0..1000 {
        let entity_type = match i % 3 {
            0 => EntityType::Character,
            1 => EntityType::Location,
            _ => EntityType::Item,
        };
        entities.push(LoreEntity {
            id: format!("ent-{i}"),
            project_id: "bench-proj".into(),
            entity_type,
            name: format!("Entity{i}"),
            aliases: vec![format!("Alias{i}")],
            color_hex: "#6366f1".into(),
            meta_json: "{}".into(),
            created_at: 1000,
            updated_at: 1000,
        });
    }

    // Build ~10,000 words text with mentions distributed across prose
    let words = [
        "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog",
        "and", "then", "suddenly", "silence", "descends", "upon", "the", "realm",
        "of", "whispering", "shadows",
    ];
    let mut text = String::with_capacity(70_000);
    for w_idx in 0..10_000 {
        if w_idx % 25 == 0 {
            let ent_idx = (w_idx / 25) % 1000;
            let prefix = entities[ent_idx].entity_type.prefix();
            text.push(prefix);
            text.push_str(&format!("Entity{ent_idx} "));
        } else {
            text.push_str(words[w_idx % words.len()]);
            text.push(' ');
        }
    }

    // Warm-up scan
    let _ = scan_known_mentions(&text, &entities);

    // Timed scan
    let start = std::time::Instant::now();
    let mentions = scan_known_mentions(&text, &entities);
    let duration = start.elapsed();

    assert_eq!(mentions.len(), 400); // 10,000 / 25 = 400 mentions
    println!("Gate 4 throughput: 1,000 entities in 10,000 words extracted in {:?}", duration);
    // Even in debug mode, Aho-Corasick handles this in milliseconds (< 5ms in debug, < 300us in release)
    assert!(duration.as_millis() < 50, "Scan took too long: {:?}", duration);
}
