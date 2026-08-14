import React from 'react';
import { Sparkles } from 'lucide-react';
import { GachaRewardItem } from '../types';
import { RARITY_COLORS } from '../constants';
import { AnimatedMountSprite } from './AnimatedMountSprite';

export const GachaRewardModal: React.FC<{
  rewards: GachaRewardItem[] | null;
  onClose: () => void;
}> = ({ rewards, onClose }) => {
  if (!rewards) return null;

  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0d1322, #111827)',
          border: '2px solid #f59e0b',
          borderRadius: '20px',
          padding: '20px 16px',
          maxWidth: '640px',
          width: 'min(640px, calc(100vw - 24px))',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(245,158,11,0.5)',
          color: '#fff',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            color: '#fbbf24',
            fontSize: '16px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Sparkles style={{ width: '20px', height: '20px', color: '#fde047' }} />
          KẾT QUẢ MỞ RƯƠNG LINH THÚ!
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: rewards.length > 1 ? 'repeat(5, minmax(0, 1fr))' : '1fr',
            gap: '8px',
            marginBottom: '18px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {rewards.map((r, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${RARITY_COLORS[r.rarity] || '#f59e0b'}`,
                borderRadius: '12px',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                minWidth: 0,
                boxSizing: 'border-box',
                overflow: 'hidden',
                boxShadow: `0 0 10px ${RARITY_COLORS[r.rarity]}22`
              }}
            >
              {r.type === 'mount' && r.mountId ? (
                <div
                  style={{
                    height: rewards.length > 1 ? '38px' : '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AnimatedMountSprite mountId={r.mountId} size={rewards.length > 1 ? 40 : 60} />
                </div>
              ) : r.iconImage ? (
                <div
                  style={{
                    height: rewards.length > 1 ? '38px' : '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={r.iconImage}
                    alt={r.name}
                    style={{
                      width: rewards.length > 1 ? '30px' : '48px',
                      height: rewards.length > 1 ? '30px' : '48px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))'
                    }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: rewards.length > 1 ? '24px' : '44px', lineHeight: 1 }}>{r.icon}</span>
              )}
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: RARITY_COLORS[r.rarity],
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  display: 'block',
                  padding: '0 2px'
                }}
                title={r.name}
              >
                {r.name}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'linear-gradient(135deg,#f59e0b,#eab308)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 24px',
            color: '#000',
            fontWeight: 900,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245,158,11,0.4)'
          }}
        >
          THU NHẬN TẤT CẢ ✨
        </button>
      </div>
    </div>
  );
};
