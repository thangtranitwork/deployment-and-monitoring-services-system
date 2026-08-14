import React from 'react';
import { Lock } from 'lucide-react';
import { LEVEL_CONFIG } from '../constants';
import { BunnySkinSprite } from '../components/BunnySkinSprite';

export const SkinsTab: React.FC<{
  xp: number;
  activeSkin: string;
  onSelectSkin: (skinId: string, skinName: string) => void;
}> = ({ xp, activeSkin, onSelectSkin }) => {
  return (
    <>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 800,
          color: 'rgba(251,191,36,0.85)',
          marginBottom: '10px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}
      >
        DANH SÁCH 17 THÂN PHÁP / SKIN THỎ
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))',
          gap: '10px',
          maxHeight: '460px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px'
        }}
      >
        {LEVEL_CONFIG.map(lvl => {
          const unlocked = xp >= lvl.reqXp;
          const equipped = activeSkin === lvl.skinId;
          return (
            <button
              key={lvl.skinId}
              disabled={!unlocked}
              onClick={() => {
                if (unlocked) {
                  onSelectSkin(lvl.skinId, lvl.name);
                }
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: equipped
                  ? 'rgba(245,158,11,0.18)'
                  : unlocked
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.35)',
                border: `1px solid ${
                  equipped ? '#f59e0b' : unlocked ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)'
                }`,
                color: equipped ? '#fde68a' : unlocked ? '#e2e8f0' : '#4b5563',
                cursor: unlocked ? 'pointer' : 'not-allowed',
                opacity: unlocked ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <BunnySkinSprite level={lvl.level} size={42} />
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: equipped ? '#fbbf24' : unlocked ? '#f1f5f9' : '#64748b'
                    }}
                  >
                    Lv.{lvl.level}: {lvl.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: unlocked ? '#fde68a' : '#475569' }}>
                    {unlocked ? `Thân Pháp Lv.${lvl.level}` : `Khóa (${lvl.reqXp} XP)`}
                  </div>
                </div>
              </div>
              {equipped ? (
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#000',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '9.5px',
                    fontWeight: 900
                  }}
                >
                  Mặc
                </span>
              ) : unlocked ? (
                <span
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    color: '#fde68a',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '9.5px',
                    fontWeight: 800
                  }}
                >
                  Mặc
                </span>
              ) : (
                <Lock style={{ width: '13px', height: '13px', color: '#475569' }} />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
