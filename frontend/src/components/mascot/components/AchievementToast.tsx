import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { Achievement } from '../types';
import { ITEM_CONFIG, HERB_CONFIG } from '../constants';

export const AchievementToast: React.FC<{
  achievement: Achievement | null;
  onClose: () => void;
}> = ({ achievement, onClose }) => {
  if (!achievement) return null;

  const rewardItemConfig = achievement.reward.itemId
    ? ITEM_CONFIG.find(i => i.id === achievement.reward.itemId) || HERB_CONFIG.find(h => (h.id as string) === achievement.reward.itemId)
    : null;

  return (
    <div
      className="fixed top-8 left-1/2 -translate-x-1/2 z-[1001] pointer-events-auto flex items-center gap-3 animate-bounce"
      style={{
        background: 'linear-gradient(135deg, rgba(20,25,40,0.97), rgba(10,13,22,0.98))',
        border: '2px solid #f59e0b',
        borderRadius: '16px',
        padding: '12px 20px',
        boxShadow: '0 0 35px rgba(245,158,11,0.6)',
        backdropFilter: 'blur(16px)',
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      <div style={{ fontSize: '28px', flexShrink: 0 }}>🏆</div>
      <div>
        <div
          style={{
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles style={{ width: '13px', height: '13px', color: '#fde047' }} /> MỞ KHÓA THÀNH TỰU MỚI!
        </div>
        <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
          {achievement.icon} {achievement.title}
        </div>
        <div style={{ color: '#86efac', fontSize: '11px', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {rewardItemConfig?.iconImage && (
            <img src={rewardItemConfig.iconImage} alt="Reward" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
          )}
          <span>🎁 Thưởng: {achievement.rewardText}</span>
        </div>
      </div>
      <button
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          color: '#94a3b8',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          marginLeft: '8px'
        }}
      >
        <X style={{ width: '14px', height: '14px' }} />
      </button>
    </div>
  );
};
