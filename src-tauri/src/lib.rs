pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::open_project,
            commands::list_tracks,
            commands::create_track,
            commands::set_track_muted,
            commands::list_scenes,
            commands::create_scene,
            commands::update_scene_content,
            commands::move_scene,
            commands::delete_scene,
            commands::list_anchors,
            commands::create_anchor,
            commands::assemble_manuscript,
            commands::list_entities,
            commands::get_ego_graph,
            commands::compute_tonal_metrics,
            commands::audit_timeline,
            commands::export_markdown,
            commands::export_docx,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
