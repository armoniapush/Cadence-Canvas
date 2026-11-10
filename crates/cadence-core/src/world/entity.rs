use std::fmt;
use std::str::FromStr;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use crate::error::CadenceError;

/// Categorization of a lore entity with its canonical mention prefix.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Character,
    Location,
    Item,
}

impl EntityType {
    pub fn prefix(&self) -> char { match self { Self::Character => '@', Self::Location => '#', Self::Item => '!' } }
    pub fn from_prefix(prefix: char) -> Option<Self> { match prefix { '@' => Some(Self::Character), '#' => Some(Self::Location), '!' => Some(Self::Item), _ => None } }
    pub fn as_str(&self) -> &'static str { match self { Self::Character => "character", Self::Location => "location", Self::Item => "item" } }
    pub fn default_color(&self) -> &'static str { match self { Self::Character => "#3b82f6", Self::Location => "#10b981", Self::Item => "#f59e0b" } }
}

impl fmt::Display for EntityType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { write!(f, "{}", self.as_str()) }
}

impl FromStr for EntityType {
    type Err = CadenceError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_lowercase().as_str() {
            "character" => Ok(Self::Character),
            "location" => Ok(Self::Location),
            "item" => Ok(Self::Item),
            other => Err(CadenceError::Validation(format!("Unknown entity type: '{other}'"))),
        }
    }
}

/// A story-world entity (character, location, or item) tracked across scenes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LoreEntity {
    pub id: String,
    pub project_id: String,
    pub entity_type: EntityType,
    pub name: String,
    pub aliases: Vec<String>,
    pub color_hex: String,
    pub meta_json: String,
    pub created_at: i64,
    pub updated_at: i64,
}

impl LoreEntity {
    pub fn validate(name: &str) -> Result<(), CadenceError> {
        if name.trim().is_empty() { return Err(CadenceError::Validation("Entity name cannot be empty".into())); }
        Ok(())
    }

    pub fn create(conn: &Connection, project_id: &str, entity_type: EntityType, name: &str, aliases: &[&str], color_hex: Option<&str>) -> Result<Self, CadenceError> {
        Self::validate(name)?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let color = color_hex.unwrap_or_else(|| entity_type.default_color()).to_string();
        let aliases_vec: Vec<String> = aliases.iter().map(|a| a.trim().to_string()).filter(|a| !a.is_empty()).collect();
        let aliases_json = serde_json::to_string(&aliases_vec)?;
        let meta_json = "{}".to_string();

        conn.execute(
            "INSERT INTO entities (id, project_id, entity_type, name, aliases_json, color_hex, meta_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![&id, project_id, entity_type.as_str(), name.trim(), &aliases_json, &color, &meta_json, now, now],
        )?;

        Ok(Self { id, project_id: project_id.to_string(), entity_type, name: name.trim().to_string(), aliases: aliases_vec, color_hex: color, meta_json, created_at: now, updated_at: now })
    }

    pub fn list_by_project(conn: &Connection, project_id: &str) -> Result<Vec<Self>, CadenceError> {
        let mut stmt = conn.prepare("SELECT id, project_id, entity_type, name, aliases_json, color_hex, meta_json, created_at, updated_at FROM entities WHERE project_id = ?1 ORDER BY name ASC")?;
        let rows = stmt.query_map(params![project_id], Self::from_row)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Self, CadenceError> {
        let mut stmt = conn.prepare("SELECT id, project_id, entity_type, name, aliases_json, color_hex, meta_json, created_at, updated_at FROM entities WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? { Ok(Self::from_row(row)?) } else { Err(CadenceError::NotFound(format!("LoreEntity not found: {id}"))) }
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<bool, CadenceError> {
        Ok(conn.execute("DELETE FROM entities WHERE id = ?1", params![id])? > 0)
    }

    pub fn update_meta(conn: &Connection, id: &str, meta_json: &str) -> Result<(), CadenceError> {
        let now = chrono::Utc::now().timestamp();
        let rows = conn.execute(
            "UPDATE entities SET meta_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![meta_json, now, id],
        )?;
        if rows == 0 {
            return Err(CadenceError::NotFound(format!("LoreEntity not found: {id}")));
        }
        Ok(())
    }

    pub fn find_by_name_or_alias(conn: &Connection, project_id: &str, query: &str) -> Result<Option<Self>, CadenceError> {
        let q = query.trim();
        if q.is_empty() { return Ok(None); }
        let clean = q.trim_start_matches(|c| c == '@' || c == '#' || c == '!');
        for entity in Self::list_by_project(conn, project_id)? {
            if entity.name.eq_ignore_ascii_case(q) || entity.name.eq_ignore_ascii_case(clean)
                || entity.aliases.iter().any(|a| a.eq_ignore_ascii_case(q) || a.eq_ignore_ascii_case(clean)) {
                return Ok(Some(entity));
            }
        }
        Ok(None)
    }

    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        let type_str: String = row.get(2)?;
        let entity_type = EntityType::from_str(&type_str)
            .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e)))?;
        let aliases_json: String = row.get(4)?;
        let aliases: Vec<String> = serde_json::from_str(&aliases_json).unwrap_or_default();
        Ok(Self {
            id: row.get(0)?, project_id: row.get(1)?, entity_type, name: row.get(3)?,
            aliases, color_hex: row.get(5)?, meta_json: row.get(6)?, created_at: row.get(7)?, updated_at: row.get(8)?,
        })
    }
}
