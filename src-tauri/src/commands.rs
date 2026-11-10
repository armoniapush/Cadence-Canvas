use cadence_core::{
    assemble_project, audit_temporal_causality, compute_tonal_histogram, export_docx_to_file,
    export_markdown_to_file, extract_entity_ego_graph, AnachronismIssue, AssembledScene, Database,
    DocxExportOptions, EgoGraph, LoreEntity, MarkdownExportOptions, Project,
    ReadingAnchor, Scene, TonalHistogram, Track,
};

#[tauri::command]
pub fn open_project(path: String) -> Result<Project, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    let projects = Project::list(db.conn()).map_err(|e| e.to_string())?;
    if let Some(proj) = projects.into_iter().next() {
        Ok(proj)
    } else {
        Project::create(db.conn(), "Untitled Project", "").map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn list_tracks(path: String, project_id: String) -> Result<Vec<Track>, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Track::list_by_project(db.conn(), &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_track(
    path: String,
    project_id: String,
    name: String,
    color: String,
    order: i64,
) -> Result<Track, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Track::create(db.conn(), &project_id, &name, &color, order).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_track_muted(path: String, id: String, is_muted: bool) -> Result<(), String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Track::set_muted(db.conn(), &id, is_muted).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_scenes(path: String, project_id: String) -> Result<Vec<Scene>, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Scene::list_by_project(db.conn(), &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_scene(
    path: String,
    track_id: String,
    title: String,
    t_start: i64,
    duration: i64,
    text: String,
) -> Result<Scene, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Scene::create_with_defaults(db.conn(), &track_id, t_start, duration, &title, &text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_scene_content(
    path: String,
    id: String,
    version: i64,
    title: String,
    text: String,
) -> Result<Scene, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Scene::update_content(db.conn(), &id, version, &title, &text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_scene(
    path: String,
    id: String,
    version: i64,
    track_id: String,
    t_start: i64,
    duration: i64,
) -> Result<Scene, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Scene::move_coordinates(db.conn(), &id, version, &track_id, t_start, duration)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_scene(path: String, id: String) -> Result<(), String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    Scene::delete(db.conn(), &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_anchors(path: String, project_id: String) -> Result<Vec<ReadingAnchor>, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    ReadingAnchor::list_by_project(db.conn(), &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_anchor(
    path: String,
    project_id: String,
    source_scene_id: String,
    target_scene_id: String,
    anchor_type: String,
    weight: f64,
) -> Result<ReadingAnchor, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    ReadingAnchor::create(
        db.conn(),
        &project_id,
        &source_scene_id,
        &target_scene_id,
        &anchor_type,
        weight,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn assemble_manuscript(path: String, project_id: String) -> Result<Vec<AssembledScene>, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    assemble_project(db.conn(), &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_entities(path: String, project_id: String) -> Result<Vec<LoreEntity>, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    LoreEntity::list_by_project(db.conn(), &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_ego_graph(
    path: String,
    project_id: String,
    entity_id: String,
) -> Result<EgoGraph, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    extract_entity_ego_graph(db.conn(), &project_id, &entity_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn compute_tonal_metrics(text: String) -> Result<TonalHistogram, String> {
    Ok(compute_tonal_histogram(&text, &[]))
}

#[tauri::command]
pub fn audit_timeline(path: String, project_id: String) -> Result<Vec<AnachronismIssue>, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    audit_temporal_causality(db.conn(), &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_markdown(
    path: String,
    project_id: String,
    output_path: String,
) -> Result<String, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    let proj = Project::get_by_id(db.conn(), &project_id).map_err(|e| e.to_string())?;
    let scenes = assemble_project(db.conn(), &project_id).map_err(|e| e.to_string())?;
    let options = MarkdownExportOptions::default();
    export_markdown_to_file(&output_path, &proj, &scenes, &options).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub fn export_docx(
    path: String,
    project_id: String,
    output_path: String,
) -> Result<String, String> {
    let db = Database::open(&path).map_err(|e| e.to_string())?;
    let proj = Project::get_by_id(db.conn(), &project_id).map_err(|e| e.to_string())?;
    let scenes = assemble_project(db.conn(), &project_id).map_err(|e| e.to_string())?;
    let options = DocxExportOptions::default();
    export_docx_to_file(&output_path, &proj, &scenes, &options).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ipc_commands_lifecycle() {
        let dir = tempfile::tempdir().expect("tempdir");
        let db_path = dir.path().join("test_project.cadence").display().to_string();

        // 1. open_project
        let project = open_project(db_path.clone()).expect("open_project");
        assert_eq!(project.title, "Untitled Project");

        // 2. create_track & list_tracks
        let track = create_track(
            db_path.clone(),
            project.id.clone(),
            "Main Plot".to_string(),
            "#6366f1".to_string(),
            0,
        )
        .expect("create_track");
        assert_eq!(track.name, "Main Plot");

        let tracks = list_tracks(db_path.clone(), project.id.clone()).expect("list_tracks");
        assert_eq!(tracks.len(), 1);
        assert!(!tracks[0].is_muted);

        // 2b. set_track_muted
        set_track_muted(db_path.clone(), track.id.clone(), true).expect("set_track_muted true");
        let tracks_muted = list_tracks(db_path.clone(), project.id.clone()).expect("list_tracks after mute");
        assert!(tracks_muted[0].is_muted);

        set_track_muted(db_path.clone(), track.id.clone(), false).expect("set_track_muted false");
        let tracks_unmuted = list_tracks(db_path.clone(), project.id.clone()).expect("list_tracks after unmute");
        assert!(!tracks_unmuted[0].is_muted);

        // 3. create_scene & list_scenes
        let scene = create_scene(
            db_path.clone(),
            track.id.clone(),
            "Opening".to_string(),
            0,
            120,
            "The protagonist enters the narrative station.".to_string(),
        )
        .expect("create_scene");
        assert_eq!(scene.title, "Opening");
        assert_eq!(scene.version, 1);

        let scenes = list_scenes(db_path.clone(), project.id.clone()).expect("list_scenes");
        assert_eq!(scenes.len(), 1);

        // 4. update_scene_content
        let updated = update_scene_content(
            db_path.clone(),
            scene.id.clone(),
            scene.version,
            "Opening Restructured".to_string(),
            "The protagonist enters the narrative station and inspects the tactical HUD.".to_string(),
        )
        .expect("update_scene_content");
        assert_eq!(updated.version, 2);
        assert_eq!(updated.title, "Opening Restructured");

        // 5. move_scene
        let moved = move_scene(
            db_path.clone(),
            scene.id.clone(),
            updated.version,
            track.id.clone(),
            10,
            150,
        )
        .expect("move_scene");
        assert_eq!(moved.version, 3);
        assert_eq!(moved.t_start, 10);
        assert_eq!(moved.duration, 150);

        // 5b. create_anchor & list_anchors
        let scene2 = create_scene(
            db_path.clone(),
            track.id.clone(),
            "Second Scene".to_string(),
            200,
            100,
            "Scene 2 text.".to_string(),
        )
        .expect("create_scene 2");
        let anchor = create_anchor(
            db_path.clone(),
            project.id.clone(),
            moved.id.clone(),
            scene2.id.clone(),
            "causal".to_string(),
            1.0,
        )
        .expect("create_anchor");
        assert_eq!(anchor.anchor_type, "causal");
        let anchors = list_anchors(db_path.clone(), project.id.clone()).expect("list_anchors");
        assert_eq!(anchors.len(), 1);
        assert_eq!(anchors[0].id, anchor.id);

        // 6. assemble_manuscript
        let assembled = assemble_manuscript(db_path.clone(), project.id.clone()).expect("assemble_manuscript");
        assert_eq!(assembled.len(), 2);
        assert_eq!(assembled[0].sequence_index, 0);
        assert_eq!(assembled[1].sequence_index, 1);

        // 7. compute_tonal_metrics
        let metrics = compute_tonal_metrics("“Where are we?” asked the commander. He ran towards the console!".to_string())
            .expect("compute_tonal_metrics");
        assert!(metrics.total_words > 0);
        assert!(metrics.dialogue > 0.0);

        // 8. audit_timeline & entities
        let db = Database::open(&db_path).expect("open db for entity creation");
        let entity = LoreEntity::create(db.conn(), &project.id, cadence_core::EntityType::Character, "Valeria", &["Val"], None).expect("create entity");
        let entities = list_entities(db_path.clone(), project.id.clone()).expect("list_entities");
        assert_eq!(entities.len(), 1);
        assert_eq!(entities[0].id, entity.id);

        let ego = get_ego_graph(db_path.clone(), project.id.clone(), entity.id.clone()).expect("get_ego_graph");
        assert_eq!(ego.center.id, entity.id);

        let issues = audit_timeline(db_path.clone(), project.id.clone()).expect("audit_timeline");
        assert!(issues.is_empty());

        // 9. export_markdown
        let md_out = dir.path().join("manuscript.md").display().to_string();
        let md_res = export_markdown(db_path.clone(), project.id.clone(), md_out.clone()).expect("export_markdown");
        assert_eq!(md_res, md_out);
        assert!(std::path::Path::new(&md_out).exists());

        // 10. export_docx
        let docx_out = dir.path().join("manuscript.docx").display().to_string();
        let docx_res = export_docx(db_path.clone(), project.id.clone(), docx_out.clone()).expect("export_docx");
        assert_eq!(docx_res, docx_out);
        assert!(std::path::Path::new(&docx_out).exists());

        // 11. delete_scene & verify removal
        delete_scene(db_path.clone(), scene2.id.clone()).expect("delete_scene");
        let remaining_scenes = list_scenes(db_path.clone(), project.id.clone()).expect("list_scenes after delete");
        assert_eq!(remaining_scenes.len(), 1);
        assert_eq!(remaining_scenes[0].id, moved.id);
        assert!(delete_scene(db_path.clone(), scene2.id.clone()).is_err());
    }
}
