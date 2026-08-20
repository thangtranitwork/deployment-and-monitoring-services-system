import React, { useState } from 'react';
import { Sparkles, Hammer, Lock, BookOpen } from 'lucide-react';
import { ForgeBoosterId, Inventory } from '../types';
import { LEVEL_CONFIG, ITEM_CONFIG, TREASURE_UPGRADE_COST } from '../constants';
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
  const [selectedTreasureId, setSelectedTreasureId] = useState<number>(activeTreasureId || 1);

  const activeBoosterConfig = effectiveBoosterId !== 'none' ? ITEM_CONFIG.find(i => i.id === effectiveBoosterId) : null;
  const selectedLvlConfig = LEVEL_CONFIG.find(l => l.level === selectedTreasureId) || LEVEL_CONFIG[0];
  const isSelectedUnlocked = xp >= selectedLvlConfig.reqXp;
  const isSelectedEquipped = activeTreasureId === selectedTreasureId;

  const forgeTalismanQty = inventory.forge_talisman || 0;
  const skyStoneQty = inventory.sky_stone || 0;

  const currentTreasureLvl = treasureLevels[selectedTreasureId] || 1;
  const nextLvl = currentTreasureLvl + 1;
  const curBonus = getTreasureExpBonusPercent(selectedTreasureId, currentTreasureLvl);
  const nextBonus = getTreasureExpBonusPercent(selectedTreasureId, nextLvl);
  const upgradeCost = currentTreasureLvl * 100;
  const baseRate = getTreasureUpgradeSuccessRate(currentTreasureLvl);
  const effectiveRate = Math.min(1.0, baseRate + boosterBonusRate);
  const effectiveRatePercent = Math.round(effectiveRate * 100);

  return (
    <div style={{ display: 'flex', gap: '14px', height: '460px' }}>
      {/* ─── LEFT COLUMN: Master List ────────────────────────────────────────── */}
      <div
        style={{
          width: '250px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '10px',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 900,
            color: '#38bdf8',
            marginBottom: '4px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>🔮 DANH SÁCH PHÁP BẢO</span>
          <span style={{ color: '#fde047', fontSize: '10.5px', fontWeight: 900 }}>💎 {spiritStones}</span>
        </div>

        {LEVEL_CONFIG.map(lvl => {
          const tId = lvl.level;
          const unlocked = xp >= lvl.reqXp;
          const equipped = activeTreasureId === tId;
          const isSelected = selectedTreasureId === tId;
          const tLvl = treasureLevels[tId] || 1;
          const tBonus = getTreasureExpBonusPercent(tId, tLvl);

          return (
            <button
              key={tId}
              onClick={() => setSelectedTreasureId(tId)}
              style={{
                padding: '9px 11px',
                borderRadius: '10px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(168,85,247,0.25))'
                  : equipped
                  ? 'rgba(56,189,248,0.12)'
                  : unlocked
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.25)',
                border: `1px solid ${
                  isSelected
                    ? '#38bdf8'
                    : equipped
                    ? 'rgba(56,189,248,0.4)'
                    : unlocked
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent'
                }`,
                color: isSelected ? '#bae6fd' : unlocked ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                opacity: unlocked ? 1 : 0.6,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <TreasureSprite treasureId={tId} size={38} />
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: isSelected ? '#38bdf8' : unlocked ? '#f1f5f9' : '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {lvl.skinName}
                  </div>
                  <div style={{ fontSize: '10.5px', color: unlocked ? '#86efac' : '#64748b' }}>
                    {unlocked ? `Cấp ${tLvl} (+${tBonus}% XP)` : `${lvl.reqXp.toLocaleString()} XP`}
                  </div>
                </div>
              </div>

              {equipped ? (
                <span
                  style={{
                    background: '#38bdf8',
                    color: '#000',
                    padding: '3px 7px',
                    borderRadius: '5px',
                    fontSize: '9.5px',
                    fontWeight: 900
                  }}
                >
                  Dùng
                </span>
              ) : !unlocked ? (
                <Lock style={{ width: '13px', height: '13px', color: '#475569', flexShrink: 0 }} />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ─── RIGHT COLUMN: Detail & Action Panel ─────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(56,189,248,0.25)',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          overflowY: 'auto'
        }}
      >
        <div>
          {/* Header Preview & Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '18px',
                background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(0,0,0,0.6) 80%)',
                border: '1.5px solid rgba(56,189,248,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 24px rgba(56,189,248,0.3)'
              }}
            >
              <TreasureSprite treasureId={selectedTreasureId} size={64} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: '17px', color: '#38bdf8', marginBottom: '3px' }}>
                {selectedLvlConfig.skinName}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span>Cấp Rèn: <strong style={{ color: '#fde047' }}>Cấp {currentTreasureLvl}</strong></span>
                <span>Buff EXP: <strong style={{ color: '#86efac' }}>+{curBonus}%</strong></span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                Dành cho tiên gia đạt cảnh giới <strong>{selectedLvlConfig.name}</strong> ({selectedLvlConfig.reqXp.toLocaleString()} XP)
              </div>
            </div>
          </div>

          {/* Treasure Lore Data Box */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen style={{ width: '13px', height: '13px' }} /> TRUYỀN THUYẾT PHÁP BẢO HỘ THỂ:
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
              Pháp bảo hộ thể thái cổ được rèn từ tinh hoa linh mạch núi thiêng. Mỗi lần tôi luyện thành công sẽ kích hoạt thêm linh văn hộ ấn, gia tăng đáng kể linh lực thu hoạch cho chủ nhân.
            </div>
          </div>

          {/* Booster Selection Bar */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#fde68a', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles style={{ width: '13px', height: '13px', color: '#fde047' }} /> VẬT PHẨM BỔ TRỢ RÈN (TIÊU HAO 1 CÁI / LẦN RÈN)
              </span>
              {forgeTalismanQty === 0 && skyStoneQty === 0 && (
                <button
                  onClick={onSwitchToCrafting}
                  style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#86efac', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                >
                  + Chế Tạo
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                onClick={() => onSelectBooster('none')}
                style={{
                  background: effectiveBoosterId === 'none' ? 'rgba(56,189,248,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${effectiveBoosterId === 'none' ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                  color: effectiveBoosterId === 'none' ? '#38bdf8' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Không Dùng
              </button>

              <button
                onClick={() => onSelectBooster('forge_talisman')}
                disabled={forgeTalismanQty === 0}
                style={{
                  background: effectiveBoosterId === 'forge_talisman' ? 'rgba(245,158,11,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${effectiveBoosterId === 'forge_talisman' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                  color: forgeTalismanQty > 0 ? '#fde68a' : '#64748b',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  cursor: forgeTalismanQty > 0 ? 'pointer' : 'not-allowed',
                  opacity: forgeTalismanQty > 0 ? 1 : 0.5
                }}
              >
                📜 Thần Luyện Phù ({forgeTalismanQty})
              </button>

              <button
                onClick={() => onSelectBooster('sky_stone')}
                disabled={skyStoneQty === 0}
                style={{
                  background: effectiveBoosterId === 'sky_stone' ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${effectiveBoosterId === 'sky_stone' ? '#a855f7' : 'rgba(255,255,255,0.08)'}`,
                  color: skyStoneQty > 0 ? '#d8b4fe' : '#64748b',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  cursor: skyStoneQty > 0 ? 'pointer' : 'not-allowed',
                  opacity: skyStoneQty > 0 ? 1 : 0.5
                }}
              >
                💠 Bổ Thiên Thạch ({skyStoneQty})
              </button>
            </div>
          </div>

          {/* Upgrade Forecast Specs */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '5px' }}>
              <span style={{ color: '#cbd5e1' }}>Mục Tiêu Tôi Luyện:</span>
              <span style={{ color: '#fde047', fontWeight: 800 }}>Cấp {currentTreasureLvl} ➔ Cấp {nextLvl} (+{nextBonus}% EXP)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '5px' }}>
              <span style={{ color: '#cbd5e1' }}>Tỉ Lệ Thành Công:</span>
              <span style={{ color: effectiveRatePercent >= 80 ? '#86efac' : effectiveRatePercent >= 50 ? '#fde047' : '#fca5a5', fontWeight: 900 }}>
                {effectiveRatePercent}% {activeBoosterConfig ? `(+${Math.round(boosterBonusRate * 100)}% từ ${activeBoosterConfig.name})` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
              <span style={{ color: '#cbd5e1' }}>Chi Phí Rèn:</span>
              <span style={{ color: spiritStones >= upgradeCost ? '#38bdf8' : '#ef4444', fontWeight: 900 }}>💎 {upgradeCost.toLocaleString()} Linh Thạch</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              if (isSelectedUnlocked) {
                onSelectTreasure(selectedTreasureId, selectedLvlConfig.skinName, curBonus);
              }
            }}
            disabled={!isSelectedUnlocked || isSelectedEquipped}
            style={{
              flex: 1,
              background: isSelectedEquipped
                ? 'rgba(100,116,139,0.3)'
                : isSelectedUnlocked
                ? 'rgba(56,189,248,0.2)'
                : 'rgba(50,50,50,0.4)',
              border: `1px solid ${isSelectedUnlocked && !isSelectedEquipped ? '#38bdf8' : 'transparent'}`,
              borderRadius: '12px',
              padding: '12px',
              color: isSelectedEquipped ? '#94a3b8' : isSelectedUnlocked ? '#bae6fd' : '#64748b',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: isSelectedUnlocked && !isSelectedEquipped ? 'pointer' : 'not-allowed'
            }}
          >
            {isSelectedEquipped ? 'ĐANG DÙNG' : isSelectedUnlocked ? '🔮 DÙNG PHÁP BẢO' : '🔒 CHƯA MỞ'}
          </button>

          <button
            onClick={() => {
              if (isSelectedUnlocked && spiritStones >= upgradeCost) {
                onUpgradeTreasure(selectedTreasureId);
              }
            }}
            disabled={!isSelectedUnlocked || spiritStones < upgradeCost}
            style={{
              flex: 1.4,
              background: isSelectedUnlocked && spiritStones >= upgradeCost
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(50,50,50,0.4)',
              border: `1px solid ${isSelectedUnlocked && spiritStones >= upgradeCost ? '#fde047' : 'transparent'}`,
              borderRadius: '12px',
              padding: '12px',
              color: isSelectedUnlocked && spiritStones >= upgradeCost ? '#000' : '#64748b',
              fontWeight: 900,
              fontSize: '12.5px',
              cursor: isSelectedUnlocked && spiritStones >= upgradeCost ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isSelectedUnlocked && spiritStones >= upgradeCost ? '0 0 20px rgba(245,158,11,0.4)' : 'none'
            }}
          >
            <Hammer style={{ width: '15px', height: '15px' }} />
            RÈN CẤP {nextLvl} ({upgradeCost} 💎)
          </button>
        </div>
      </div>
    </div>
  );
};
