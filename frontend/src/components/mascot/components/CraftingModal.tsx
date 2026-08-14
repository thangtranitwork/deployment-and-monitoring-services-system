import React from 'react';
import { CraftingRecipe } from '../types';
import { RARITY_COLORS } from '../constants';
import { AnimatedFurnaceSprite } from './AnimatedFurnaceSprite';

export const CraftingModal: React.FC<{
  isOpen: boolean;
  activeRecipe: CraftingRecipe | null;
  result: { success: boolean; message: string; pillName: string; pillEmoji: string } | null;
  onClose: () => void;
}> = ({ isOpen, activeRecipe, result, onClose }) => {
  if (!isOpen || !activeRecipe) return null;

  return (
    <div
      className="mascot-modal fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          background: 'radial-gradient(circle at center, rgba(35,10,15,0.98), rgba(8,10,16,0.99))',
          border: '2px solid rgba(239,68,68,0.6)',
          borderRadius: '24px',
          padding: '28px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 80px rgba(239,68,68,0.45)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header Title */}
        <div
          style={{
            color: '#ef4444',
            fontWeight: 900,
            fontSize: '18px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🔥 LÒ LUYỆN ĐAN BÁT QUÁI HỎA 🔥</span>
        </div>

        <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeRecipe.iconImage ? (
            <img
              src={activeRecipe.iconImage}
              alt={activeRecipe.name}
              style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
            />
          ) : (
            <span>{activeRecipe.emoji}</span>
          )}
          <span>
            Đang luyện chế:{' '}
            <span style={{ color: RARITY_COLORS[activeRecipe.rarity], fontWeight: 800 }}>
              {activeRecipe.name}
            </span>
          </span>
        </div>

        {/* Furnace Sprite Animation Container */}
        <div
          style={{
            position: 'relative',
            margin: '10px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <AnimatedFurnaceSprite isCrafting={!result} size={160} />
          {!result && (
            <div
              style={{
                position: 'absolute',
                inset: -12,
                borderRadius: '50%',
                border: '2px dashed rgba(239,68,68,0.5)',
                animation: 'spin 6s linear infinite',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>

        {/* Progress / Status text */}
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 700, animation: 'pulse 1s infinite' }}>
              🔥 Chân Hỏa tôi luyện... Ngưng tụ đan khí...
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#94a3b8',
                background: 'rgba(0,0,0,0.3)',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239,68,68,0.2)'
              }}
            >
              Tỉ lệ thành công:{' '}
              <strong
                style={{
                  color: activeRecipe.successRate >= 0.7 ? '#86efac' : activeRecipe.successRate >= 0.4 ? '#fde047' : '#f87171'
                }}
              >
                {Math.round(activeRecipe.successRate * 100)}%
              </strong>
              <span style={{ color: '#64748b', marginLeft: '6px' }}>(Hao hụt nếu bạo đan: 50% NVL)</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '14px',
                width: '100%',
                background: result.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${result.success ? '#10b981' : '#ef4444'}`,
                color: result.success ? '#86efac' : '#fca5a5',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>
                {result.success ? '✨ ĐAN THÀNH XUẤT LÔ ✨' : '💥 ĐAN LÔ BẠO TẠC 💥'}
              </div>
              <div>{result.message}</div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: result.success
                  ? 'linear-gradient(135deg,#10b981,#059669)'
                  : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                width: '100%'
              }}
            >
              XÁC NHẬN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
