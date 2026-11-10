import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Scene, EgoGraph, GraphNode, LoreEntity, AnachronismIssue } from '../types';
import { listEntities, getEgoGraph, auditTimeline } from '../api';

export interface RadialConstellationProps {
  projectPath: string;
  projectId: string;
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onClose?: () => void;
}

function getEntityStyle(type: string, customColor?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('char')) return { color: customColor || '#818cf8', prefix: '@', label: 'Personaje' };
  if (t.includes('loc')) return { color: customColor || '#2dd4bf', prefix: '#', label: 'Lugar' };
  return { color: customColor || '#fbbf24', prefix: '!', label: 'Objeto' };
}

export function RadialConstellation({
  projectPath,
  projectId,
  scenes,
  selectedSceneId,
  onSelectScene,
  onClose,
}: RadialConstellationProps) {
  const [entities, setEntities] = useState<LoreEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [egoGraph, setEgoGraph] = useState<EgoGraph | null>(null);
  const [anachronisms, setAnachronisms] = useState<AnachronismIssue[]>([]);
  const [tStory, setTStory] = useState<number>(0);
  const [showAudit, setShowAudit] = useState<boolean>(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Time boundaries calculated from project scenes
  const { tMin, tMax } = useMemo(() => {
    let max = 300;
    for (const s of scenes) if (s.t_start + s.duration > max) max = s.t_start + s.duration;
    return { tMin: 0, tMax: max };
  }, [scenes]);

  // Sync diegetic time with selected scene
  useEffect(() => {
    if (selectedSceneId) {
      const active = scenes.find((s) => s.id === selectedSceneId);
      if (active) setTStory(active.t_start);
    }
  }, [selectedSceneId, scenes]);

  // Load project entities and timeline audit
  useEffect(() => {
    let active = true;
    Promise.all([listEntities(projectPath, projectId), auditTimeline(projectPath, projectId)])
      .then(([ents, issues]) => {
        if (!active) return;
        setEntities(ents);
        setAnachronisms(issues);
        if (ents.length > 0 && !selectedEntityId) setSelectedEntityId(ents[0].id);
      })
      .catch((err) => console.error('Constellation load error:', err));
    return () => { active = false; };
  }, [projectPath, projectId]);

  // Load ego graph for selected entity
  useEffect(() => {
    if (!selectedEntityId) return;
    let active = true;
    getEgoGraph(projectPath, projectId, selectedEntityId)
      .then((g) => { if (active) setEgoGraph(g); })
      .catch((err) => console.error('Ego graph error:', err));
    return () => { active = false; };
  }, [projectPath, projectId, selectedEntityId]);

  // Parse lifespans from meta_json lookup map
  const entityMetaMap = useMemo(() => {
    const map = new Map<string, { born_at?: number; died_at?: number }>();
    for (const e of entities) {
      try {
        const p = JSON.parse(e.meta_json);
        map.set(e.id, {
          born_at: p.born_at != null ? Number(p.born_at) : undefined,
          died_at: p.died_at != null ? Number(p.died_at) : undefined,
        });
      } catch {}
    }
    return map;
  }, [entities]);

  const checkLifespan = useCallback((node: GraphNode) => {
    const meta = entityMetaMap.get(node.id) || { born_at: node.born_at ?? undefined, died_at: node.died_at ?? undefined };
    if (meta.born_at != null && tStory < meta.born_at) return { isAttenuated: true, reason: `No nacido (<${meta.born_at}s)` };
    if (meta.died_at != null && tStory > meta.died_at) return { isAttenuated: true, reason: `Fallecido (>${meta.died_at}s)` };
    return { isAttenuated: false, reason: null };
  }, [entityMetaMap, tStory]);

  const activeSceneAtCursor = useMemo(() => {
    return scenes.find((s) => tStory >= s.t_start && tStory <= s.t_start + s.duration) || null;
  }, [scenes, tStory]);

  const handleJumpToIssue = (issue: AnachronismIssue) => {
    setTStory(issue.scene_time);
    onSelectScene(issue.scene_id);
    if (entities.some((e) => e.id === issue.entity_id)) setSelectedEntityId(issue.entity_id);
  };

  const centerNode = egoGraph?.center;
  const neighbors = egoGraph?.neighbors || [];
  const edges = egoGraph?.edges || [];
  const maxWeight = Math.max(...edges.map((e) => e.weight), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#090a0f', color: '#e2e8f0', fontFamily: 'monospace', overflow: 'hidden', position: 'relative' }}>
      {/* Tactical Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #1e293b', backgroundColor: '#0e111a', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700 }}>◈ RED DE PERSONAJES & LUGARES</span>
          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>VISTA ORBITAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Centro Ego:</span>
          <select value={selectedEntityId || ''} onChange={(e) => setSelectedEntityId(e.target.value)} style={{ backgroundColor: '#121520', color: '#f8fafc', border: '1px solid #334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', maxWidth: '180px' }}>
            {entities.map((ent) => {
              const { prefix } = getEntityStyle(ent.entity_type);
              return <option key={ent.id} value={ent.id}>{prefix} {ent.name}</option>;
            })}
          </select>
          <button onClick={() => setShowAudit((p) => !p)} style={{ padding: '3px 8px', borderRadius: '4px', border: anachronisms.length > 0 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(16,185,129,0.4)', backgroundColor: anachronisms.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)', color: anachronisms.length > 0 ? '#f87171' : '#34d399', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            ⚠ Auditoría ({anachronisms.length})
          </button>
          {onClose && <button onClick={onClose} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}>✕ Línea de Tiempo</button>}
        </div>
      </div>

      {/* Main Radar Screen + Collapsible Audit Drawer */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="-300 -300 600 600" style={{ width: '100%', height: '100%', maxHeight: 'calc(100vh - 165px)' }}>
            {/* Orbital Rings & Crosshairs */}
            <circle cx="0" cy="0" r="240" fill="none" stroke="#1e293b" strokeWidth="1" />
            <circle cx="0" cy="0" r="170" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="0" cy="0" r="100" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
            <line x1="-280" y1="0" x2="280" y2="0" stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
            <line x1="0" y1="-280" x2="0" y2="280" stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
            <text x="5" y="-105" fill="#475569" fontSize="8">ÓRBITA I (100)</text>
            <text x="5" y="-175" fill="#475569" fontSize="8">ÓRBITA II (170)</text>
            <text x="5" y="-245" fill="#475569" fontSize="8">ÓRBITA III (240)</text>

            {/* Co-occurrence Edges */}
            {neighbors.map((neighbor, idx) => {
              const edge = edges.find((e) => (e.source_id === centerNode?.id && e.target_id === neighbor.id) || (e.target_id === centerNode?.id && e.source_id === neighbor.id));
              const weight = edge ? edge.weight : 1;
              const angle = (2 * Math.PI * idx) / neighbors.length - Math.PI / 2;
              const nx = 170 * Math.cos(angle);
              const ny = 170 * Math.sin(angle);
              const ls = checkLifespan(neighbor);
              const isHov = hoveredNodeId === neighbor.id;
              const opacity = ls.isAttenuated ? 0.12 : isHov ? 1.0 : Math.max(0.25, Math.min(0.85, weight / maxWeight));
              return (
                <g key={`edge-${neighbor.id}`}>
                  <line x1="0" y1="0" x2={nx} y2={ny} stroke={isHov ? '#38bdf8' : neighbor.color_hex || '#818cf8'} strokeWidth={Math.max(1.5, Math.min(5, weight * 1.5))} strokeOpacity={opacity} strokeDasharray={ls.isAttenuated ? '3 3' : undefined} />
                  <text x={nx * 0.55} y={ny * 0.55 - 4} fill={ls.isAttenuated ? '#64748b' : '#38bdf8'} fontSize="9" fontWeight="700" textAnchor="middle" opacity={ls.isAttenuated ? 0.3 : 0.9}>
                    w:{weight.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* 1-Hop Neighbor Nodes */}
            {neighbors.map((neighbor, idx) => {
              const angle = (2 * Math.PI * idx) / neighbors.length - Math.PI / 2;
              const nx = 170 * Math.cos(angle);
              const ny = 170 * Math.sin(angle);
              const ls = checkLifespan(neighbor);
              const style = getEntityStyle(neighbor.entity_type, neighbor.color_hex);
              const isHov = hoveredNodeId === neighbor.id;
              return (
                <g key={neighbor.id} transform={`translate(${nx}, ${ny})`} onClick={() => setSelectedEntityId(neighbor.id)} onMouseEnter={() => setHoveredNodeId(neighbor.id)} onMouseLeave={() => setHoveredNodeId(null)} style={{ cursor: 'pointer' }} opacity={ls.isAttenuated ? 0.28 : 1.0}>
                  <circle r={isHov ? 24 : 18} fill="#121520" stroke={style.color} strokeWidth={isHov ? 2.5 : 1.5} strokeDasharray={ls.isAttenuated ? '3 3' : undefined} />
                  <text textAnchor="middle" dy="4" fill={style.color} fontSize={isHov ? 13 : 11} fontWeight="700">{style.prefix}</text>
                  <text textAnchor="middle" y={isHov ? 36 : 30} fill={ls.isAttenuated ? '#94a3b8' : '#f1f5f9'} fontSize="10" fontWeight="600">{neighbor.name}</text>
                  {ls.isAttenuated && <text textAnchor="middle" y={isHov ? 48 : 42} fill="#ef4444" fontSize="8">{ls.reason}</text>}
                </g>
              );
            })}

            {/* Central Ego Node */}
            {centerNode && (() => {
              const ls = checkLifespan(centerNode);
              const style = getEntityStyle(centerNode.entity_type, centerNode.color_hex);
              return (
                <g opacity={ls.isAttenuated ? 0.35 : 1.0}>
                  <circle cx="0" cy="0" r="40" fill="none" stroke={style.color} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
                  <circle cx="0" cy="0" r="30" fill="#0f172a" stroke={style.color} strokeWidth="2.5" />
                  <text textAnchor="middle" dy="5" fill={style.color} fontSize="14" fontWeight="700">{style.prefix}</text>
                  <text textAnchor="middle" y="-46" fill="#38bdf8" fontSize="9" letterSpacing="0.05em" fontWeight="700">[ EGO CENTRAL ]</text>
                  <text textAnchor="middle" y="54" fill="#ffffff" fontSize="12" fontWeight="700">{centerNode.name}</text>
                  <text textAnchor="middle" y="68" fill="#94a3b8" fontSize="9">[ {centerNode.mention_count} menciones ]</text>
                  {ls.isAttenuated && <text textAnchor="middle" y="80" fill="#f87171" fontSize="9" fontWeight="600">⚠ {ls.reason}</text>}
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Collapsible Tactical Anachronisms Audit Panel */}
        {showAudit && (
          <div style={{ width: '310px', backgroundColor: '#0c0e17', borderLeft: '1px solid #1e293b', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', zIndex: 20 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: anachronisms.length > 0 ? '#f87171' : '#34d399', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>AUDITORÍA TEMPORAL CAUSAL</span>
              <span style={{ fontSize: '10px' }}>({anachronisms.length} alertas)</span>
            </div>
            {anachronisms.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, backgroundColor: '#121520', padding: '8px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                ✓ Cero violaciones causales detectadas. Línea diegética coherente con fechas born_at y died_at.
              </div>
            ) : (
              anachronisms.map((issue, idx) => {
                const isPost = issue.issue_type === 'post_mortem_mention';
                return (
                  <div key={`issue-${idx}`} style={{ backgroundColor: '#131722', border: isPost ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,158,11,0.4)', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', backgroundColor: isPost ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: isPost ? '#fca5a5' : '#fde047' }}>
                        {isPost ? 'POST-MORTEM' : 'PRE-BIRTH'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#38bdf8' }}>T: {issue.scene_time}s</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc' }}>{issue.entity_name} en &quot;{issue.scene_title}&quot;</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3 }}>{issue.message}</div>
                    <button onClick={() => handleJumpToIssue(issue)} style={{ marginTop: '2px', padding: '3px 6px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '3px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                      ➜ Saltar a Escena Infractora
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Diegetic Temporal Scrubber ($T_story$) */}
      <div style={{ borderTop: '1px solid #1e293b', backgroundColor: '#0c0e17', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>$T_story$ DIEGÉTICO:</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', padding: '1px 6px', backgroundColor: '#161d2d', borderRadius: '3px', border: '1px solid #334155' }}>{tStory}s</span>
            {activeSceneAtCursor && (
              <span onClick={() => onSelectScene(activeSceneAtCursor.id)} style={{ fontSize: '11px', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>
                Escena activa: &quot;{activeSceneAtCursor.title}&quot; [T: {activeSceneAtCursor.t_start} - {activeSceneAtCursor.t_start + activeSceneAtCursor.duration}s]
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setTStory((p) => Math.max(tMin, p - 10))} style={{ padding: '2px 6px', backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}>◄ -10s</button>
            <button onClick={() => setTStory((p) => Math.min(tMax, p + 10))} style={{ padding: '2px 6px', backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}>+10s ►</button>
          </div>
        </div>
        <input type="range" min={tMin} max={tMax} value={tStory} step={5} onChange={(e) => setTStory(Number(e.target.value))} style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', height: '5px', backgroundColor: '#1e293b', borderRadius: '3px' }} />
      </div>
    </div>
  );
}

export default RadialConstellation;
