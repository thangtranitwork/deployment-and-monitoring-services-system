import React from 'react';
import { Sparkles, RefreshCw, Lock } from 'lucide-react';
import { MOUNT_CONFIG, RARITY_COLORS } from '../constants';
import { AnimatedMountSprite } from '../components/AnimatedMountSprite';

export const MountsTab: React.FC<{
  ownedMounts: string[];
  activeMountId: string | null;
  gachaSpinCount: number;
  onSpinGacha: (count: number) => void;
  onToggleMount: (mountId: string, name: string) => void;
}> = ({ ownedMounts, activeMountId, gachaSpinCount, onSpinGacha, onToggleMount }) => {
  return (
    <>
      {/* Gacha Spin Controls Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.4), rgba(30,27,75,0.6))',
          border: '1px solid rgba(168,85,247,0.4)',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div
            style={{
              color: '#d8b4fe',
              fontWeight: 900,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles style={{ width: '16px', height: '16px', color: '#fde047' }} />
            ĐÀI CẦU NGUYỆN — RƯƠNG LINH THÚ GACHA
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
            Mở Rương nhận 10 Thú Cưỡi Tiên Gia 🐉 & Đan Dược • Bảo hiểm:{' '}
            <strong>{gachaSpinCount % 50}/50</strong> lần quay
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onSpinGacha(1)}
            style={{
              background: 'linear-gradient(135deg,#a855f7,#7e22ce)',
              border: '1px solid #c084fc',
              borderRadius: '10px',
              padding: '8px 14px',
              color: '#fff',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            Quay 1 Lần (100 💎)
          </button>

          <button
            onClick={() => onSpinGacha(10)}
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              border: '1px solid #fde047',
              borderRadius: '10px',
              padding: '8px 16px',
              color: '#000',
              fontWeight: 900,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles style={{ width: '14px', height: '14px' }} />
            Quay 10 Lần (900 💎)
          </button>
        </div>
      </div>

      <div
        style={{
          fontSize: '11px',
          fontWeight: 800,
          color: 'rgba(192,132,252,0.85)',
          marginBottom: '10px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}
      >
        BỘ SƯU TẬP 10 THÚ CƯỠI TIÊN GIA ({ownedMounts.length}/10)
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))',
          gap: '10px',
          maxHeight: '380px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px'
        }}
      >
        {MOUNT_CONFIG.map(m => {
          const isOwned = ownedMounts.includes(m.id);
          const isEquipped = activeMountId === m.id;

          return (
            <div
              key={m.id}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isEquipped
                  ? 'rgba(168,85,247,0.22)'
                  : isOwned
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.35)',
                border: `1px solid ${
                  isEquipped
                    ? '#c084fc'
                    : isOwned
                    ? RARITY_COLORS[m.rarity] + '55'
                    : 'rgba(255,255,255,0.04)'
                }`,
                opacity: isOwned ? 1 : 0.55
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <AnimatedMountSprite mountId={m.id} size={44} />
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: RARITY_COLORS[m.rarity],
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {m.emoji} {m.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#cbd5e1',
                      marginTop: '1px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {m.element} • +{m.dragXpBonus} XP/kéo
                  </div>
                  <div
                    style={{
                      fontSize: '9.5px',
                      color: '#fde68a',
                      fontWeight: 800,
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ⚡ {m.buffName}: <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{m.buffDescription}</span>
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>
                    {isOwned ? `Tỉ lệ Gacha: ${m.dropRate}%` : 'Chưa sở hữu (Quay Rương)'}
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0, marginLeft: '6px' }}>
                {isOwned ? (
                  <button
                    onClick={() => onToggleMount(m.id, m.name)}
                    style={{
                      background: isEquipped ? '#c084fc' : 'rgba(168,85,247,0.2)',
                      border: '1px solid rgba(168,85,247,0.5)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      color: isEquipped ? '#000' : '#d8b4fe',
                      cursor: 'pointer'
                    }}
                  >
                    {isEquipped ? 'Đang Cưỡi' : 'Cưỡi'}
                  </button>
                ) : (
                  <Lock style={{ width: '13px', height: '13px', color: '#475569' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
