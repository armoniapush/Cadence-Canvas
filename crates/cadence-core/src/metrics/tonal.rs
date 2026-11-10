use std::collections::HashSet;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::domain::{Scene, Track};
use crate::error::CadenceError;
use crate::sweep::assemble_project;
use crate::world::LoreEntity;

/// Four-channel tonal histogram inspired by tactical camera RGB instrumentation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TonalHistogram {
    pub dialogue: f64,  // Ratio de diálogo (comillas “”, "", rayas de diálogo —, verba dicendi)
    pub action: f64,    // Ratio de acción (oraciones breves, verbos dinámicos, exclamaciones)
    pub lore: f64,      // Ratio de lore/worldbuilding (menciones de entidades @, #, !, términos propios)
    pub monologue: f64, // Ratio de introspección / monólogo interior (marcadores reflexivos)
    pub total_words: usize,
    pub sentence_lengths: Vec<usize>,
    pub cadence_variance: f64, // Varianza en longitud de oraciones (ritmo prosódico)
}

impl TonalHistogram {
    pub fn empty() -> Self {
        Self { dialogue: 0.0, action: 0.0, lore: 0.0, monologue: 0.0, total_words: 0, sentence_lengths: Vec::new(), cadence_variance: 0.0 }
    }
}

impl Default for TonalHistogram {
    fn default() -> Self { Self::empty() }
}

#[derive(Default)]
struct SentenceState {
    words: usize,
    dialogue: usize,
    lore: usize,
    monologue: usize,
    action_verbs: usize,
    has_excl: bool,
}

#[inline]
fn is_verbum_dicendi(w: &str) -> bool {
    match w.len() {
        4 => matches!(w, "dijo" | "dije" | "dice" | "said"),
        5 => matches!(w, "asked" | "cried"),
        6 => matches!(w, "grito" | "gritó" | "repuso" | "yelled"),
        7 => matches!(w, "anadio" | "añadió" | "replied" | "shouted"),
        8 => matches!(w, "pregunto" | "preguntó" | "pregunta" | "exclamo" | "exclamó" | "susurro" | "susurró" | "murmuro" | "murmuró" | "inquirio" | "inquirió" | "contesto" | "contestó" | "comentó" | "muttered"),
        9 => matches!(w, "whispered"),
        10 => matches!(w, "respondio" | "respondió" | "responde" | "exclaimed"),
        _ => false,
    }
}

#[inline]
fn is_action_verb(w: &str) -> bool {
    match w.len() {
        3 => matches!(w, "ran" | "hit" | "cae"),
        4 => matches!(w, "shot" | "fled" | "mató" | "mato" | "mata" | "cayó" | "cayo" | "caer" | "huye" | "huir"),
        5 => matches!(w, "corre" | "salto" | "saltó" | "salta" | "ataco" | "atacó" | "ataca" | "huyo" | "huyó" | "lanzo" | "lanzó" | "lanza" | "freno" | "frenó" | "frena" | "choco" | "chocó" | "choca" | "matar" | "fired" | "dodged"),
        6 => matches!(w, "corrio" | "corrió" | "correr" | "golpeo" | "golpeó" | "golpea" | "rompio" | "rompió" | "romper" | "rompe" | "jumped" | "struck" | "dashed" | "killed"),
        7 => matches!(w, "disparo" | "disparó" | "dispara" | "saltar" | "atacar" | "lanzar" | "estallo" | "estalló" | "estalla" | "esquivo" | "esquivó" | "esquiva" | "chocar" | "frenar" | "slashed" | "crashed"),
        8 => matches!(w, "golpear" | "estallar" | "esquivar" | "attacked" | "exploded"),
        _ => false,
    }
}

#[inline]
fn is_monologue_marker(w: &str) -> bool {
    match w.len() {
        1 => matches!(w, "i"),
        2 => matches!(w, "yo" | "mí" | "mi" | "me"),
        4 => matches!(w, "duda" | "supe" | "temi" | "temí" | "temo" | "felt" | "knew"),
        5 => matches!(w, "penso" | "pensó" | "pensé" | "pense" | "dudé" | "dude" | "dudar" | "quiza" | "quizá" | "sabia" | "sabía" | "saber" | "temia" | "temía" | "temer" | "temor"),
        6 => matches!(w, "pensar" | "quizas" | "quizás" | "siento" | "sentia" | "sentía" | "sentir" | "sentí" | "senti" | "dudaba" | "imagino" | "imaginó" | "myself"),
        7 => matches!(w, "pensaba" | "recordo" | "recordó" | "recordé" | "recorde" | "conmigo" | "thought" | "feared"),
        8 => matches!(w, "recordar" | "wondered" | "pondered" | "doubted"),
        9 => matches!(w, "recordaba" | "entendio" | "entendió" | "remembered"),
        10 => matches!(w, "comprendio" | "comprendió"),
        _ => false,
    }
}

#[inline]
fn round_metric(val: f64) -> f64 { ((val * 10000.0).round()) / 10000.0 }

fn compute_cadence_variance(lengths: &[usize]) -> f64 {
    if lengths.len() <= 1 { return 0.0; }
    let n = lengths.len() as f64;
    let mean = lengths.iter().sum::<usize>() as f64 / n;
    let var = lengths.iter().map(|&l| { let d = l as f64 - mean; d * d }).sum::<f64>() / n;
    round_metric(var)
}

#[inline]
fn is_sentence_terminator(token: &str) -> bool {
    let b = token.as_bytes();
    if b.is_empty() { return false; }
    let last = b[b.len() - 1];
    if last == b'.' || last == b'?' || last == b'!' { return true; }
    if b.len() >= 2 && (last == b'"' || last == b'\'' || last == b'-') {
        let prev = b[b.len() - 2];
        if prev == b'.' || prev == b'?' || prev == b'!' { return true; }
    }
    let trimmed = token.trim_end_matches(['"', '\'', '”', '’', '»', '—', '–', '-', ')', ']']);
    trimmed.ends_with('.') || trimmed.ends_with('?') || trimmed.ends_with('!')
}

#[inline]
fn has_exclamation(token: &str) -> bool {
    let b = token.as_bytes();
    if b.is_empty() { return false; }
    if b[0] == b'!' && b.len() > 1 && b[1].is_ascii_alphanumeric() { return false; }
    token.contains('!') || token.contains('¡')
}

fn flush_sentence(s: &mut SentenceState, tw: &mut usize, td: &mut usize, tl: &mut usize, tm: &mut usize, ta: &mut f64, lengths: &mut Vec<usize>) {
    if s.words == 0 { return; }
    lengths.push(s.words);
    *tw += s.words; *td += s.dialogue; *tl += s.lore; *tm += s.monologue;
    let mut pts = s.action_verbs as f64;
    if s.words <= 6 { pts += s.words as f64 * 0.5; }
    if s.has_excl { pts += s.words as f64 * 0.3; }
    *ta += pts;
    *s = SentenceState::default();
}

#[inline]
fn to_lower_stack<'a>(s: &'a str, buf: &'a mut [u8; 64]) -> &'a str {
    if s.len() > 64 { return s; }
    let bytes = s.as_bytes();
    let mut has_upper = false;
    for &b in bytes {
        if b.is_ascii_uppercase() { has_upper = true; break; }
    }
    if !has_upper { return s; }
    for i in 0..bytes.len() { buf[i] = bytes[i].to_ascii_lowercase(); }
    std::str::from_utf8(&buf[..bytes.len()]).unwrap_or(s)
}

/// Computes the 4-channel tonal histogram of a text buffer in a single pass.
pub fn compute_tonal_histogram(text: &str, entities: &[LoreEntity]) -> TonalHistogram {
    if text.trim().is_empty() { return TonalHistogram::empty(); }

    let entity_set: HashSet<String> = entities.iter().flat_map(|e| {
        let mut names = vec![e.name.to_lowercase()];
        names.extend(e.aliases.iter().map(|a| a.to_lowercase()));
        names
    }).collect();

    let (mut total_words, mut tot_dial, mut tot_lore, mut tot_mono, mut tot_action) = (0, 0, 0, 0, 0.0);
    let mut sentence_lengths = Vec::new();
    let mut state = SentenceState::default();
    let mut in_quote = false;
    let mut buf = [0u8; 64];

    for line in text.lines() {
        let mut in_dash = false;
        for token in line.split_whitespace() {
            let tb = token.as_bytes();
            if tb.is_empty() { continue; }

            if tb[0] == b'"' || token.starts_with('“') || token.starts_with('«') { in_quote = true; }
            if token.starts_with('—') || token.starts_with('–') { in_dash = !in_dash; }
            if has_exclamation(token) { state.has_excl = true; }

            let trimmed = if (tb[0].is_ascii_alphanumeric() || tb[0] == b'@' || tb[0] == b'#' || tb[0] == b'!')
                && tb[tb.len() - 1].is_ascii_alphanumeric()
            {
                token
            } else {
                token.trim_matches(|c: char| !c.is_alphanumeric() && c != '@' && c != '#' && c != '!')
            };

            if !trimmed.is_empty() {
                let clean = to_lower_stack(trimmed, &mut buf);
                state.words += 1;
                if in_quote || in_dash || is_verbum_dicendi(clean) { state.dialogue += 1; }
                let is_lore = tb[0] == b'@' || tb[0] == b'#'
                    || (tb[0] == b'!' && tb.len() > 1 && tb[1].is_ascii_alphanumeric())
                    || entity_set.contains(clean);
                if is_lore { state.lore += 1; }
                if is_action_verb(clean) { state.action_verbs += 1; }
                if is_monologue_marker(clean) { state.monologue += 1; }
            }

            if token.ends_with('—') || token.ends_with('–') { in_dash = !in_dash; }
            if tb[tb.len() - 1] == b'"' || token.ends_with('”') || token.ends_with('»') { in_quote = false; }

            if is_sentence_terminator(token) && state.words > 0 {
                flush_sentence(&mut state, &mut total_words, &mut tot_dial, &mut tot_lore, &mut tot_mono, &mut tot_action, &mut sentence_lengths);
            }
        }
    }

    if state.words > 0 {
        flush_sentence(&mut state, &mut total_words, &mut tot_dial, &mut tot_lore, &mut tot_mono, &mut tot_action, &mut sentence_lengths);
    }

    let cadence_variance = compute_cadence_variance(&sentence_lengths);
    let (dialogue, action, lore, monologue) = if total_words > 0 {
        let tw = total_words as f64;
        (
            round_metric((tot_dial as f64 / tw).min(1.0)),
            round_metric((tot_action / tw).min(1.0)),
            round_metric((tot_lore as f64 / tw).min(1.0)),
            round_metric((tot_mono as f64 / tw).min(1.0)),
        )
    } else { (0.0, 0.0, 0.0, 0.0) };

    TonalHistogram { dialogue, action, lore, monologue, total_words, sentence_lengths, cadence_variance }
}

/// Computes the tonal histogram for a single scene retrieved from SQLite.
pub fn compute_scene_histogram(conn: &Connection, scene_id: &str) -> Result<TonalHistogram, CadenceError> {
    let scene = Scene::get_by_id(conn, scene_id)?;
    let track = Track::get_by_id(conn, &scene.track_id)?;
    let entities = LoreEntity::list_by_project(conn, &track.project_id)?;
    Ok(compute_tonal_histogram(&scene.text, &entities))
}

/// Computes the sequence of tonal histograms for all active assembled scenes in a project.
pub fn compute_project_cadence(conn: &Connection, project_id: &str) -> Result<Vec<(String, TonalHistogram)>, CadenceError> {
    let assembled = assemble_project(conn, project_id)?;
    let entities = LoreEntity::list_by_project(conn, project_id)?;
    let mut results = Vec::with_capacity(assembled.len());
    for item in assembled {
        let hist = compute_tonal_histogram(&item.scene.text, &entities);
        results.push((item.scene.id, hist));
    }
    Ok(results)
}
