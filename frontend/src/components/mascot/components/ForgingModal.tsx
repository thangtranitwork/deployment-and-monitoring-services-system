import React from 'react';
import { ForgeBoosterId } from '../types';
import { LEVEL_CONFIG, ITEM_CONFIG } from '../constants';
import { getTreasureUpgradeSuccessRate, getTreasureExpBonusPercent } from '../utils';
import { TreasureSprite } from './TreasureSprite';
import { AnimatedThunderAnvil } from './AnimatedThunderAnvil';

export const ForgingModal: React.FC<{
  isOpen: boolean;
  treasureId: number | null;
  treasureLevels: Record<number, number>;
  activeBooster: ForgeBoosterId;
  result: { success: boolean; message: string; targetLevel: number; newBonus: number } | null;
  onClose: () => void;
}> = ({ isOpen, treasureId, treasureLevels, activeBooster, result, onClose }) => {
  if (!isOpen || !treasureId) return null;

  const targetTreasure = LEVEL_CONFIG.find(l => l.treasureId === treasureId);
  const currentLvl = treasureLevels[treasureId] || 1;
  const targetLvl = currentLvl + 1;
  const baseRate = getTreasureUpgradeSuccessRate(targetLvl);
  const usedBoosterCfg = activeBooster !== 'none' ? ITEM_CONFIG.find(i => i.id === activeBooster) : null;
  const boosterBonus = usedBoosterCfg?.forgeSuccessBonus ?? 0;
  const effectiveRate = Math.min(1.0, baseRate + boosterBonus);
  const nextBonus = getTreasureExpBonusPercent(treasureId, targetLvl);

  return (
    <div
      className="mascot-modal fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          background: 'radial-gradient(circle at center, rgba(15,25,50,0.98), rgba(4,7,16,0.99))',
          border: '2px solid rgba(56,189,248,0.6)',
          borderRadius: '24px',
          padding: '28px',
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 80px rgba(56,189,248,0.4)',
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
            color: '#38bdf8',
            fontWeight: 900,
            fontSize: '17px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚡ ĐE RÈN THẦN KHÍ LÔI ĐÌNH ⚡</span>
        </div>

        <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TreasureSprite treasureId={treasureId} size={28} />
          <span>
            Rèn: <strong style={{ color: '#38bdf8' }}>{targetTreasure?.skinName}</strong> (Cấp {currentLvl} ➔{' '}
            <span style={{ color: '#86efac' }}>Cấp {targetLvl}</span>)
          </span>
        </div>

        {usedBoosterCfg && (
          <div
            style={{
              fontSize: '11px',
              color: '#fde047',
              background: 'rgba(234,179,8,0.15)',
              border: '1px solid rgba(234,179,8,0.4)',
              borderRadius: '8px',
              padding: '3px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700
            }}
          >
            {usedBoosterCfg.iconImage ? (
              <img
                src={usedBoosterCfg.iconImage}
                alt={usedBoosterCfg.name}
                style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              />
            ) : (
              <span>{usedBoosterCfg.emoji}</span>
            )}
            <span>
              Gia trì: <strong>{usedBoosterCfg.name}</strong> (+{Math.round(boosterBonus * 100)}% TC)
            </span>
          </div>
        )}

        {/* Thunder Anvil Sprite Container */}
        <div
          style={{
            position: 'relative',
            margin: '10px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <AnimatedThunderAnvil isForging={!result} size={180} />
          {!result && (
            <div
              style={{
                position: 'absolute',
                inset: -14,
                borderRadius: '50%',
                border: '2px dashed rgba(56,189,248,0.5)',
                animation: 'spin 5s linear infinite',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>

        {/* Progress / Status text */}
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#7dd3fc', fontWeight: 700, animation: 'pulse 1s infinite' }}>
              ⚡ Dẫn Cửu Thiên Lôi Điện... Tôi luyện thần binh...
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#94a3b8',
                background: 'rgba(0,0,0,0.35)',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(56,189,248,0.2)'
              }}
            >
              Tỉ lệ thành công:{' '}
              <strong
                style={{
                  color: effectiveRate >= 0.7 ? '#86efac' : effectiveRate >= 0.4 ? '#fde047' : '#f87171'
                }}
              >
                {Math.round(effectiveRate * 100)}%
              </strong>
              {usedBoosterCfg && (
                <span style={{ color: '#86efac', marginLeft: '6px', fontWeight: 700 }}>
                  ({Math.round(baseRate * 100)}% + {Math.round(boosterBonus * 100)}% {usedBoosterCfg.emoji})
                </span>
              )}
              <span style={{ color: '#64748b', marginLeft: '6px' }}>
                (Thất bại: {Math.round((1 - effectiveRate) * 100)}%)
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '14px',
                width: '100%',
                background: result.success ? 'rgba(56,189,248,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${result.success ? '#38bdf8' : '#ef4444'}`,
                color: result.success ? '#7dd3fc' : '#fca5a5',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>
                {result.success ? '✨ KHAI QUANG ĐẠI THÀNH ✨' : '⚡ LÔI ĐIỆN BẠO TẠC ⚡'}
              </div>
              <div>{result.message}</div>
              {result.success && (
                <div style={{ fontSize: '12px', color: '#86efac', marginTop: '4px', fontWeight: 800 }}>
                  ⭐ Buff hiệu quả: Tăng {nextBonus}% EXP nhận được khi đeo!
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                background: result.success
                  ? 'linear-gradient(135deg,#0284c7,#0369a1)'
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
