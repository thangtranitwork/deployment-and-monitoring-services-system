import React from 'react';
import { Sparkles } from 'lucide-react';
import { ForgeBoosterId, Inventory } from '../types';
import { LEVEL_CONFIG, ITEM_CONFIG } from '../constants';
import { getTreasureExpBonusPercent, getTreasureUpgradeSuccessRate } from '../utils';
import { TreasureSprite } from '../components/TreasureSprite';

export const TreasuresTab: React.FC<{
  xp: number;
  activeTreasureId: number;
  treasureLevels: Record<number, number>;
  spiritStones: number;
  inventory: Inventory;
  effectiveBoosterId: ForgeBoosterId;
  boosterBonusRate: number;
  onSelectBooster: (boosterId: ForgeBoosterId) => void;
  onSelectTreasure: (treasureId: number, name: string, bonus: number) => void;
  onUpgradeTreasure: (treasureId: number) => void;
  onSwitchToCrafting: () => void;
}> = ({
  xp,
  activeTreasureId,
  treasureLevels,
  spiritStones,
  inventory,
  effectiveBoosterId,
  boosterBonusRate,
  onSelectBooster,
  onSelectTreasure,
  onUpgradeTreasure,
  onSwitchToCrafting
}) => {
  const activeBoosterConfig = effectiveBoosterId !== 'none' ? ITEM_CONFIG.find(i => i.id === effectiveBoosterId) : null;

  return (
    <>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 800,
          color: 'rgba(56,189,248,0.85)',
          marginBottom: '10px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>DANH SÁCH 17 PHÁP BẢO HỘ THỂ (MỖI CẤP TĂNG BUFF EXP)</span>
        <span style={{ color: '#38bdf8' }}>💎 {spiritStones} Linh Thạch</span>
      </div>

      {/* Booster Selector Bar (Tiêu hao theo từng lần rèn) */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.85))',
          border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: '12px',
          padding: '10px 12px',
          marginBottom: '12px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '4px'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              textTransform: 'uppercase'
            }}
          >
            <Sparkles style={{ width: '13px', height: '13px', color: '#fde047' }} />
            <span>VẬT PHẨM BỔ TRỢ RÈN (TIÊU HAO 1 CÁI / LẦN RÈN)</span>
          </div>
          {inventory.forge_talisman === 0 && inventory.sky_stone === 0 && (
            <button
              onClick={onSwitchToCrafting}
              style={{
                background: 'rgba(16,185,129,0.18)',
                border: '1px solid #10b98166',
                color: '#86efac',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🧪 Luyện bùa trong Lò Bát Quái ➔
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {/* Option 1: Không dùng */}
          <button
            onClick={() => onSelectBooster('none')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 8px',
              borderRadius: '8px',
              background: effectiveBoosterId === 'none' ? 'rgba(56,189,248,0.2)' : 'rgba(0,0,0,0.3)',
              border: `1.5px solid ${effectiveBoosterId === 'none' ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
              color: effectiveBoosterId === 'none' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800 }}>⚪ Không Dùng</span>
            <span style={{ fontSize: '9px', color: '#64748b' }}>Tỉ lệ gốc</span>
          </button>

          {/* Option 2: Thần Luyện Phù */}
          {(() => {
            const qty = inventory.forge_talisman || 0;
            const isSelected = effectiveBoosterId === 'forge_talisman';
            const disabled = qty <= 0;
            return (
              <button
                onClick={() => !disabled && onSelectBooster('forge_talisman')}
                disabled={disabled}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: isSelected
                    ? 'rgba(234,179,8,0.25)'
                    : disabled
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(234,179,8,0.08)',
                  border: `1.5px solid ${
                    isSelected ? '#fde047' : disabled ? 'rgba(100,116,139,0.2)' : '#fde04755'
                  }`,
                  color: isSelected ? '#fde047' : disabled ? '#64748b' : '#fde68a',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  textAlign: 'center',
                  boxShadow: isSelected ? '0 0 10px rgba(253,224,71,0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="/items/18_than_luyen_phu.png" alt="Thần Luyện Phù" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  Thần Luyện Phù
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    color: isSelected ? '#86efac' : disabled ? '#64748b' : '#cbd5e1',
                    fontWeight: 700
                  }}
                >
                  +20% TC • (Có: {qty})
                </span>
              </button>
            );
          })()}

          {/* Option 3: Bổ Thiên Thạch */}
          {(() => {
            const qty = inventory.sky_stone || 0;
            const isSelected = effectiveBoosterId === 'sky_stone';
            const disabled = qty <= 0;
            return (
              <button
                onClick={() => !disabled && onSelectBooster('sky_stone')}
                disabled={disabled}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: isSelected
                    ? 'rgba(192,132,252,0.25)'
                    : disabled
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(192,132,252,0.08)',
                  border: `1.5px solid ${
                    isSelected ? '#c084fc' : disabled ? 'rgba(100,116,139,0.2)' : '#c084fc55'
                  }`,
                  color: isSelected ? '#e9d5ff' : disabled ? '#64748b' : '#d8b4fe',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  textAlign: 'center',
                  boxShadow: isSelected ? '0 0 10px rgba(192,132,252,0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="/items/25_bo_thien_thach.png" alt="Bổ Thiên Thạch" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  Bổ Thiên Thạch
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    color: isSelected ? '#86efac' : disabled ? '#64748b' : '#cbd5e1',
                    fontWeight: 700
                  }}
                >
                  +35% TC & Hoàn 50% • ({qty})
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '10px',
          maxHeight: '430px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px'
        }}
      >
        {LEVEL_CONFIG.map(lvl => {
          const unlocked = xp >= lvl.reqXp;
          const equipped = activeTreasureId === lvl.treasureId;
          const tLvl = treasureLevels[lvl.treasureId] || 1;
          const upgradeCost = tLvl * 100;
          const canAfford = spiritStones >= upgradeCost && tLvl < 10;
          const currentBonus = getTreasureExpBonusPercent(lvl.treasureId, tLvl);
          const nextBonus = getTreasureExpBonusPercent(lvl.treasureId, tLvl + 1);

          return (
            <div
              key={lvl.treasureId}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: equipped
                  ? 'rgba(56,189,248,0.18)'
                  : unlocked
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.35)',
                border: `1px solid ${
                  equipped ? '#38bdf8' : unlocked ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.04)'
                }`,
                opacity: unlocked ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <TreasureSprite treasureId={lvl.treasureId} size={42} />
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '12px',
                        color: equipped ? '#38bdf8' : unlocked ? '#f1f5f9' : '#64748b'
                      }}
                    >
                      {lvl.skinName}
                    </div>
                    <div style={{ fontSize: '10.5px', color: unlocked ? '#38bdf8' : '#475569', fontWeight: 700 }}>
                      ⚡ Cấp {tLvl}/10 <span style={{ color: '#86efac' }}>(+{currentBonus}% EXP)</span>
                    </div>
                  </div>
                </div>
                {unlocked && (
                  <button
                    onClick={() => onSelectTreasure(lvl.treasureId, lvl.skinName, currentBonus)}
                    style={{
                      background: equipped ? '#38bdf8' : 'rgba(56,189,248,0.15)',
                      color: equipped ? '#000' : '#38bdf8',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {equipped ? 'Đang Ngự' : 'Ngự'}
                  </button>
                )}
              </div>

              {unlocked &&
                tLvl < 10 &&
                (() => {
                  const baseRate = getTreasureUpgradeSuccessRate(tLvl + 1);
                  const effectiveRate = Math.min(1.0, baseRate + boosterBonusRate);
                  const ratePercent = Math.round(effectiveRate * 100);
                  const basePercent = Math.round(baseRate * 100);
                  const bonusPercent = Math.round(boosterBonusRate * 100);
                  const rateColor = ratePercent >= 70 ? '#86efac' : ratePercent >= 45 ? '#fde047' : '#f87171';

                  return (
                    <button
                      onClick={() => onUpgradeTreasure(lvl.treasureId)}
                      disabled={!canAfford}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '10.5px',
                        background: canAfford
                          ? 'linear-gradient(135deg,#0284c7,#0369a1)'
                          : 'rgba(100,116,139,0.2)',
                        border: `1px solid ${canAfford ? '#38bdf8' : 'transparent'}`,
                        color: canAfford ? '#fff' : '#64748b',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>
                        🔨 Rèn Cấp {tLvl + 1} (+{nextBonus}% EXP)
                      </span>
                      <span
                        style={{
                          color: canAfford ? rateColor : '#64748b',
                          fontSize: '9.5px',
                          background: 'rgba(0,0,0,0.35)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {ratePercent}% TC{' '}
                        {boosterBonusRate > 0 &&
                          `(${basePercent}%+${bonusPercent}% ${activeBoosterConfig?.emoji})`}{' '}
                        • {upgradeCost} 💎
                      </span>
                    </button>
                  );
                })()}
              {unlocked && tLvl >= 10 && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#c084fc',
                    fontWeight: 800,
                    textAlign: 'center',
                    background: 'rgba(192,132,252,0.12)',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                >
                  ✨ PHÁP BẢO TỐI CAO (CẤP 10: +{currentBonus}% EXP) — HÀO QUANG 3D
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
