use aho_corasick::{AhoCorasick, MatchKind};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;
use super::entity::{EntityType, LoreEntity};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MentionSpan {
    pub entity_id: Option<String>,
    pub matched_text: String,
    pub prefix: char,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CandidateMention {
    pub matched_text: String,
    pub prefix: char,
    pub token: String,
    pub start: usize,
    pub end: usize,
}

impl CandidateMention {
    pub fn entity_type(&self) -> Option<EntityType> { EntityType::from_prefix(self.prefix) }
}

pub struct MentionScanner;

impl MentionScanner {
    /// Extracts exact known mentions from `text` using Aho-Corasick matching in memory.
    pub fn scan_known_mentions(text: &str, entities: &[LoreEntity]) -> Vec<MentionSpan> {
        if entities.is_empty() || text.is_empty() { return Vec::new(); }
        let mut patterns = Vec::new();
        let mut meta = Vec::new();

        for entity in entities {
            let p = entity.entity_type.prefix();
            let name = entity.name.trim_start_matches(|c| c == '@' || c == '#' || c == '!');
            if !name.is_empty() { patterns.push(format!("{p}{name}")); meta.push((entity.id.clone(), p)); }
            for a in &entity.aliases {
                let alias = a.trim_start_matches(|c| c == '@' || c == '#' || c == '!');
                if !alias.is_empty() { patterns.push(format!("{p}{alias}")); meta.push((entity.id.clone(), p)); }
            }
        }
        if patterns.is_empty() { return Vec::new(); }

        let ac = match AhoCorasick::builder().match_kind(MatchKind::LeftmostLongest).build(&patterns) {
            Ok(ac) => ac,
            Err(_) => return Vec::new(),
        };

        let mut mentions = Vec::new();
        for m in ac.find_iter(text) {
            let (start, end) = (m.start(), m.end());
            let valid_left = start == 0 || !text[..start].chars().next_back().map_or(false, |c| c.is_alphanumeric());
            let valid_right = end == text.len() || !text[end..].chars().next().map_or(false, |c| c.is_alphanumeric() || c == '_');

            if valid_left && valid_right {
                let (entity_id, prefix) = &meta[m.pattern().as_usize()];
                mentions.push(MentionSpan {
                    entity_id: Some(entity_id.clone()),
                    matched_text: text[start..end].to_string(),
                    prefix: *prefix,
                    start,
                    end,
                });
            }
        }
        mentions
    }

    /// Detects any potential mention candidate (`@Token`, `#Token`, `!Token`) in text.
    pub fn scan_all_candidates(text: &str) -> Vec<CandidateMention> {
        let mut candidates = Vec::new();
        let mut chars = text.char_indices().peekable();
        let mut prev: Option<char> = None;

        while let Some((idx, c)) = chars.next() {
            if (c == '@' || c == '#' || c == '!') && prev.map_or(true, |p| !p.is_alphanumeric()) {
                let prefix = c;
                let token_start = idx + c.len_utf8();
                let mut token_end = token_start;

                while let Some(&(next_idx, next_c)) = chars.peek() {
                    if next_c.is_alphanumeric() || next_c == '_' {
                        token_end = next_idx + next_c.len_utf8();
                        prev = Some(next_c);
                        chars.next();
                    } else { break; }
                }

                if token_end > token_start {
                    candidates.push(CandidateMention {
                        matched_text: text[idx..token_end].to_string(),
                        prefix,
                        token: text[token_start..token_end].to_string(),
                        start: idx,
                        end: token_end,
                    });
                }
            } else { prev = Some(c); }
        }
        candidates
    }

    /// Detects mention candidates not yet tracked in the given lore entities list.
    pub fn scan_untracked_candidates(text: &str, entities: &[LoreEntity]) -> Vec<CandidateMention> {
        Self::scan_all_candidates(text).into_iter().filter(|c| {
            !entities.iter().any(|e| {
                e.entity_type.prefix() == c.prefix && (e.name.eq_ignore_ascii_case(&c.token) || e.aliases.iter().any(|a| a.eq_ignore_ascii_case(&c.token)))
            })
        }).collect()
    }

    /// Persists extracted mentions for a scene in `scene_entity_mentions`.
    pub fn sync_scene_mentions(conn: &Connection, scene_id: &str, mentions: &[MentionSpan]) -> Result<(), CadenceError> {
        conn.execute("DELETE FROM scene_entity_mentions WHERE scene_id = ?1", params![scene_id])?;
        let now = chrono::Utc::now().timestamp();
        let mut stmt = conn.prepare("INSERT INTO scene_entity_mentions (id, scene_id, entity_id, matched_text, prefix, start_offset, end_offset, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")?;
        for s in mentions {
            let id = uuid::Uuid::new_v4().to_string();
            stmt.execute(params![&id, scene_id, &s.entity_id, &s.matched_text, &s.prefix.to_string(), s.start as i64, s.end as i64, now])?;
        }
        Ok(())
    }

    /// Counts persisted mentions for a scene.
    pub fn count_scene_mentions(conn: &Connection, scene_id: &str) -> Result<usize, CadenceError> {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM scene_entity_mentions WHERE scene_id = ?1", params![scene_id], |r| r.get(0))?;
        Ok(count as usize)
    }

    /// Retrieves persisted mentions for a scene.
    pub fn get_scene_mentions(conn: &Connection, scene_id: &str) -> Result<Vec<MentionSpan>, CadenceError> {
        let mut stmt = conn.prepare("SELECT entity_id, matched_text, prefix, start_offset, end_offset FROM scene_entity_mentions WHERE scene_id = ?1 ORDER BY start_offset ASC")?;
        let rows = stmt.query_map(params![scene_id], |r| {
            let p: String = r.get(2)?;
            let (s, e): (i64, i64) = (r.get(3)?, r.get(4)?);
            Ok(MentionSpan { entity_id: r.get(0)?, matched_text: r.get(1)?, prefix: p.chars().next().unwrap_or('@'), start: s as usize, end: e as usize })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
}

pub fn scan_known_mentions(text: &str, entities: &[LoreEntity]) -> Vec<MentionSpan> { MentionScanner::scan_known_mentions(text, entities) }
pub fn scan_all_candidates(text: &str) -> Vec<CandidateMention> { MentionScanner::scan_all_candidates(text) }
pub fn scan_untracked_candidates(text: &str, entities: &[LoreEntity]) -> Vec<CandidateMention> { MentionScanner::scan_untracked_candidates(text, entities) }
pub fn sync_scene_mentions(conn: &Connection, scene_id: &str, mentions: &[MentionSpan]) -> Result<(), CadenceError> { MentionScanner::sync_scene_mentions(conn, scene_id, mentions) }
