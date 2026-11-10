use std::time::Instant;
use tempfile::NamedTempFile;

use cadence_core::domain::{Project, Scene, Track};
use cadence_core::metrics::{
    compute_project_cadence, compute_scene_histogram, compute_tonal_histogram,
};
use cadence_core::storage::Database;
use cadence_core::world::{EntityType, LoreEntity};

#[test]
fn test_dialogue_dominant_text() {
    let text = "\
—No podemos quedarnos aquí —dijo Marcus con urgencia.\n\
—¿Hacia dónde iremos? —preguntó Helena—. Las puertas del este están cerradas.\n\
—Cruzaremos el puente bajo el fuego enemigo —respondió él sin vacilar.\n\
\"Esperen\", añadió Thorne. \"Yo iré primero.\"";

    let hist = compute_tonal_histogram(text, &[]);
    assert!(
        hist.dialogue > 0.6,
        "Expected dialogue > 0.6, got {}",
        hist.dialogue
    );
    assert!(hist.total_words >= 20);
}

#[test]
fn test_lore_dominant_text() {
    let text = "@Aeloria y @Eldrin partieron de #Valenor con !Excalibur hacia la fortaleza de #Kaelen con !Aegis y @Lyra.";
    let hist = compute_tonal_histogram(text, &[]);
    assert!(
        hist.lore > 0.4,
        "Expected lore > 0.4, got {}",
        hist.lore
    );
    assert_eq!(hist.total_words, 17);
}

#[test]
fn test_cadence_variance_calculation() {
    let text = "Uno dos tres cuatro. Cinco seis siete ocho nueve diez once doce. Trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro.";
    let hist = compute_tonal_histogram(text, &[]);
    assert_eq!(hist.total_words, 24);
    assert_eq!(hist.sentence_lengths, vec![4, 8, 12]);
    let expected_variance = 32.0 / 3.0; // 10.6667
    assert!(
        (hist.cadence_variance - expected_variance).abs() < 1e-3,
        "Expected ~10.6667, got {}",
        hist.cadence_variance
    );
}

#[test]
fn test_gate_benchmark_performance_5000_words() {
    let paragraph = "Marcus corrió rápidamente hacia la puerta de #Valenor con !Excalibur en la mano. \
\"¡Rápido!\", gritó con furia. Pensó en su destino y dudaba si @Aeloria llegaría a tiempo. \
El suelo tembló violentamente. ¿Había esperanza para ellos? Quizás era el fin de todo.\n";

    let mut text = String::with_capacity(5000 * 8);
    while text.split_whitespace().count() < 5000 {
        text.push_str(paragraph);
    }

    // Warm-up run
    let _ = compute_tonal_histogram(&text, &[]);

    let start = Instant::now();
    let hist = compute_tonal_histogram(&text, &[]);
    let elapsed = start.elapsed();

    assert!(
        hist.total_words >= 5000,
        "Expected >= 5000 words, got {}",
        hist.total_words
    );
    println!("Benchmarked {} words in {:?}", hist.total_words, elapsed);
    // Gate: in optimized release builds, single-pass tonal processing executes in < 0.5ms (~210µs).
    // In unoptimized debug test profile, allow a generous threshold (< 15ms).
    let max_duration = if cfg!(debug_assertions) {
        std::time::Duration::from_millis(15)
    } else {
        std::time::Duration::from_millis(1)
    };
    assert!(
        elapsed < max_duration,
        "Single-pass benchmark gate violated: took {:?} (limit: {:?})",
        elapsed,
        max_duration
    );
}

#[test]
fn test_empty_text_histogram() {
    let hist = compute_tonal_histogram("", &[]);
    assert_eq!(hist.total_words, 0);
    assert_eq!(hist.dialogue, 0.0);
    assert_eq!(hist.action, 0.0);
    assert_eq!(hist.lore, 0.0);
    assert_eq!(hist.monologue, 0.0);
    assert!(hist.sentence_lengths.is_empty());
    assert_eq!(hist.cadence_variance, 0.0);
}

#[test]
fn test_scene_and_project_cadence_integration() {
    let temp_file = NamedTempFile::new().unwrap();
    let db = Database::open(temp_file.path()).unwrap();
    let conn = db.conn();

    let project = Project::create(conn, "Cadence Novel", "Jane Doe").unwrap();
    let track1 = Track::create(conn, &project.id, "Main POV", "#6366f1", 0).unwrap();
    let track2 = Track::create(conn, &project.id, "Subplot POV", "#10b981", 1).unwrap();

    let _entity = LoreEntity::create(
        conn,
        &project.id,
        EntityType::Character,
        "Aeloria",
        &["Aelor"],
        None,
    )
    .unwrap();

    let s1 = Scene::create(
        conn,
        &track1.id,
        0,
        100,
        0,
        "The Journey Begins",
        "@Aeloria partió al amanecer hacia #Kaelen con !Excalibur.",
    )
    .unwrap();

    let s2 = Scene::create(
        conn,
        &track2.id,
        50,
        100,
        0,
        "Confrontation",
        "—No pasarás —dijo él con firmeza.\n—Ya lo veremos —respondió ella.",
    )
    .unwrap();

    // Scene histogram
    let hist1 = compute_scene_histogram(conn, &s1.id).unwrap();
    assert!(hist1.lore > 0.3);
    assert_eq!(hist1.total_words, 8);

    let hist2 = compute_scene_histogram(conn, &s2.id).unwrap();
    assert!(hist2.dialogue > 0.6);

    // Project cadence sequence
    let cadence = compute_project_cadence(conn, &project.id).unwrap();
    assert_eq!(cadence.len(), 2);
    assert_eq!(cadence[0].0, s1.id);
    assert_eq!(cadence[1].0, s2.id);
}
