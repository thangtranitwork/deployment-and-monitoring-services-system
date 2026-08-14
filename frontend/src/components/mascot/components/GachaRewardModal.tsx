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
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1322',
          border: '2px solid #f59e0b',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 50px rgba(245,158,11,0.5)',
          color: '#fff'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            color: '#fbbf24',
            fontSize: '18px',
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
          <Sparkles style={{ width: '22px', height: '22px', color: '#fde047' }} />
          KẾT QUẢ MỞ RƯƠNG LINH THÚ!
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: rewards.length > 1 ? 'repeat(5, 1fr)' : '1fr',
            gap: '10px',
            marginBottom: '16px'
          }}
        >
          {rewards.map((r, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${RARITY_COLORS[r.rarity] || '#f59e0b'}`,
                borderRadius: '12px',
                padding: '10px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {r.type === 'mount' && r.mountId ? (
                <div
                  style={{
                    height: rewards.length > 1 ? '40px' : '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AnimatedMountSprite mountId={r.mountId} size={rewards.length > 1 ? 44 : 64} />
                </div>
              ) : r.iconImage ? (
                <div
                  style={{
                    height: rewards.length > 1 ? '40px' : '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={r.iconImage}
                    alt={r.name}
                    style={{
                      width: rewards.length > 1 ? '32px' : '52px',
                      height: rewards.length > 1 ? '32px' : '52px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))'
                    }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: rewards.length > 1 ? '28px' : '48px', lineHeight: 1 }}>{r.icon}</span>
              )}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: RARITY_COLORS[r.rarity],
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '90px'
                }}
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
            cursor: 'pointer'
          }}
        >
          THU NHẬN TẤT CẢ ✨
        </button>
      </div>
    </div>
  );
};
