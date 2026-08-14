import React, { useState } from 'react';
import { Sparkles, RefreshCw, Lock, Utensils, Info } from 'lucide-react';
import { MOUNT_CONFIG, RARITY_COLORS, HERB_CONFIG, FOOD_CONFIG } from '../constants';
import { HerbId } from '../types';
import { AnimatedMountSprite } from '../components/AnimatedMountSprite';

export interface MountsTabProps {
  ownedMounts: string[];
  activeMountId: string | null;
  gachaSpinCount: number;
  mountLevels?: Record<string, number>;
  mountExp?: Record<string, number>;
  herbsInventory?: Record<string, number>;
  spiritStones?: number;
  onSpinGacha: (count: number) => void;
  onToggleMount: (mountId: string, name: string) => void;
  onFeedMount?: (mountId: string, foodId: string, amount: number) => void;
}

export const MountsTab: React.FC<MountsTabProps> = ({
  ownedMounts,
  activeMountId,
  gachaSpinCount,
  mountLevels = {},
  mountExp = {},
  herbsInventory = {} as Record<string, number>,
  spiritStones = 0,
  onSpinGacha,
  onToggleMount,
  onFeedMount
}) => {
  const [selectedMountId, setSelectedMountId] = useState<string>(activeMountId || MOUNT_CONFIG[0].id);
  const [foodSearchQuery, setFoodSearchQuery] = useState<string>('');
  const [foodRarityFilter, setFoodRarityFilter] = useState<'all' | 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme'>('all');

  const selectedMount = MOUNT_CONFIG.find(m => m.id === selectedMountId) || MOUNT_CONFIG[0];
  const isOwned = ownedMounts.includes(selectedMount.id);
  const isEquipped = activeMountId === selectedMount.id;

  const level = mountLevels[selectedMount.id] || 1;
  const curExp = mountExp[selectedMount.id] || 0;
  const reqExp = level * 100;
  const expPercent = Math.min(100, Math.max(0, (curExp / reqExp) * 100));
  const levelBonus = (level - 1) * 5;
  const totalDragBonus = selectedMount.dragXpBonus + levelBonus;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '460px' }}>
      {/* Gacha Spin Controls Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.4), rgba(30,27,75,0.6))',
          border: '1px solid rgba(168,85,247,0.4)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0
        }}
      >
        <div>
          <div
            style={{
              color: '#d8b4fe',
              fontWeight: 900,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles style={{ width: '15px', height: '15px', color: '#fde047' }} />
            ĐÀI CẦU NGUYỆN — RƯƠNG LINH THÚ GACHA
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
            Mở Rương nhận 10 Thú Cưỡi Tiên Gia 🐉 • Bảo hiểm: <strong>{gachaSpinCount % 50}/50</strong> lần quay
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onSpinGacha(1)}
            style={{
              background: 'linear-gradient(135deg,#a855f7,#7e22ce)',
              border: '1px solid #c084fc',
              borderRadius: '8px',
              padding: '7px 14px',
              color: '#fff',
              fontWeight: 800,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            Quay 1x (100 💎)
          </button>

          <button
            onClick={() => onSpinGacha(10)}
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              border: '1px solid #fde047',
              borderRadius: '8px',
              padding: '7px 16px',
              color: '#000',
              fontWeight: 900,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles style={{ width: '14px', height: '14px' }} />
            Quay 10x (900 💎)
          </button>
        </div>
      </div>

      {/* 2-Column Master-Detail Layout */}
      <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>
        {/* ─── LEFT COLUMN: Master List ────────────────────────────────────────── */}
        <div
          style={{
            width: '240px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '8px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#c084fc',
              marginBottom: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            🐴 THÚ CƯỠI ({ownedMounts.length}/10)
          </div>

          {MOUNT_CONFIG.map(m => {
            const owned = ownedMounts.includes(m.id);
            const equipped = activeMountId === m.id;
            const isSelected = selectedMountId === m.id;
            const mLevel = mountLevels[m.id] || 1;

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMountId(m.id)}
                style={{
                  padding: '9px 11px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(245,158,11,0.25))'
                    : equipped
                    ? 'rgba(168,85,247,0.15)'
                    : owned
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${
                    isSelected
                      ? '#c084fc'
                      : equipped
                      ? 'rgba(168,85,247,0.4)'
                      : owned
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent'
                  }`,
                  color: isSelected ? '#d8b4fe' : owned ? '#e2e8f0' : '#64748b',
                  cursor: 'pointer',
                  opacity: owned ? 1 : 0.55,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <AnimatedMountSprite mountId={m.id} size={36} />
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '12px',
                        color: isSelected ? '#c084fc' : RARITY_COLORS[m.rarity],
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {m.emoji} {m.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: owned ? '#86efac' : '#64748b' }}>
                      {owned ? `Cấp ${mLevel}` : 'Chưa thu phục'}
                    </div>
                  </div>
                </div>

                {equipped ? (
                  <span
                    style={{
                      background: '#c084fc',
                      color: '#000',
                      padding: '3px 7px',
                      borderRadius: '6px',
                      fontSize: '9.5px',
                      fontWeight: 900
                    }}
                  >
                    Cưỡi
                  </span>
                ) : !owned ? (
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
            border: `1px solid ${RARITY_COLORS[selectedMount.rarity]}44`,
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: `0 0 25px ${RARITY_COLORS[selectedMount.rarity]}15`,
            overflowY: 'auto'
          }}
        >
          <div>
            {/* Header Preview & Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(0,0,0,0.6) 80%)',
                  border: `1.5px solid ${RARITY_COLORS[selectedMount.rarity]}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AnimatedMountSprite mountId={selectedMount.id} size={64} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 900, fontSize: '16px', color: RARITY_COLORS[selectedMount.rarity] }}>
                    {selectedMount.emoji} {selectedMount.name}
                  </span>
                  {isOwned && (
                    <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b88', color: '#fde047', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '5px' }}>
                      Cấp {level}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '4px' }}>
                  Hệ Phương: <strong style={{ color: '#bae6fd' }}>{selectedMount.element}</strong> • Drag Bonus: <strong style={{ color: '#86efac' }}>+{totalDragBonus} XP/kéo Thỏ</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '3px', fontWeight: 700 }}>
                  ⚡ {selectedMount.buffName}: <span style={{ fontWeight: 400, color: '#e2e8f0' }}>{selectedMount.buffDescription}</span>
                </div>
              </div>
            </div>

            {/* Mount Description & Lore Data */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#c084fc', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info style={{ width: '12px', height: '12px' }} /> TRUYỀN THUYẾT & NGUỒN GỐC LINH THÚ:
              </div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {selectedMount.description || `Linh thú thuộc chủng tộc ${selectedMount.species}, tích tụ linh khí thiên địa qua hàng ngàn năm. Khi đồng hành cùng Thỏ Linh sẽ gia tăng đáng kể tốc độ kéo thả và ban thưởng duyên cơ khi tu luyện.`}
              </div>
            </div>

            {/* EXP & Level Bar */}
            {isOwned ? (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
                  <span>Tiến Độ Nuôi Linh Thú Thăng Cấp:</span>
                  <span style={{ color: '#86efac', fontWeight: 800 }}>{curExp}/{reqExp} EXP ({expPercent.toFixed(0)}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ height: '100%', width: `${expPercent}%`, background: 'linear-gradient(90deg, #10b981, #f59e0b)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', marginBottom: '14px' }}>
                🔒 Chưa sở hữu Linh Thú này. Hãy dùng Linh Thạch 💎 quay Rương Gacha để thu phục!
              </div>
            )}

            {/* Spacious Feeding Materials Grid */}
            {isOwned && (
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '12px 14px', borderRadius: '12px', marginBottom: '14px', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#86efac', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Utensils style={{ width: '14px', height: '14px' }} />
                    <span>CHO LINH THÚ ĂN ĐỂ NÂNG CẤP (+5% XP/CẤP):</span>
                  </div>
                </div>

                {/* Food Search & Filter Controls */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="🔍 Tìm thức ăn..."
                    value={foodSearchQuery}
                    onChange={e => setFoodSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      background: 'rgba(15,23,42,0.85)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[
                      { key: 'all', label: 'Tất Cả' },
                      { key: 'common', label: 'Thường' },
                      { key: 'uncommon', label: 'Hiếm' },
                      { key: 'rare', label: 'Trân Quý' },
                      { key: 'legendary', label: 'Truyền Thuyết' },
                      { key: 'supreme', label: 'Chí Bảo' }
                    ].map(r => (
                      <button
                        key={r.key}
                        onClick={() => setFoodRarityFilter(r.key as any)}
                        style={{
                          background: foodRarityFilter === r.key ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.25)',
                          border: `1px solid ${foodRarityFilter === r.key ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                          color: foodRarityFilter === r.key ? '#86efac' : '#94a3b8',
                          borderRadius: '5px',
                          padding: '2px 6px',
                          fontSize: '9.5px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {FOOD_CONFIG
                    .filter(food => {
                      const matchesRarity = foodRarityFilter === 'all' || food.rarity === foodRarityFilter;
                      const matchesSearch = !foodSearchQuery.trim() || food.name.toLowerCase().includes(foodSearchQuery.toLowerCase());
                      return matchesRarity && matchesSearch;
                    })
                    .map(food => {
                    const qty = herbsInventory[food.id] || 0;
                    const expValue = food.expValue;
                    const canFeed1 = qty >= 1;

                    return (
                      <div
                        key={food.id}
                        style={{
                          background: qty > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${qty > 0 ? '#10b98155' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '8px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          opacity: qty > 0 ? 1 : 0.45
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          {food.iconImage ? (
                            <img src={food.iconImage} alt={food.name} style={{ width: '26px', height: '26px', objectFit: 'contain', flexShrink: 0 }} />
                          ) : (
                            <span style={{ fontSize: '16px' }}>{food.emoji}</span>
                          )}
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: RARITY_COLORS[food.rarity] }}>
                              {food.name}
                            </div>
                            <div style={{ fontSize: '9.5px', color: '#86efac', fontWeight: 700 }}>
                              Có: {qty} • +{expValue} EXP
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                          <button
                            onClick={() => onFeedMount && onFeedMount(selectedMount.id, food.id, 1)}
                            disabled={!canFeed1}
                            style={{
                              background: canFeed1 ? '#10b98133' : 'transparent',
                              border: `1px solid ${canFeed1 ? '#10b981' : '#64748b44'}`,
                              color: canFeed1 ? '#86efac' : '#64748b',
                              borderRadius: '5px',
                              padding: '3px 8px',
                              fontSize: '10px',
                              fontWeight: 900,
                              cursor: canFeed1 ? 'pointer' : 'not-allowed'
                            }}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Spirit Stone Feeding Option */}
                  <div
                    style={{
                      background: spiritStones >= 50 ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${spiritStones >= 50 ? '#38bdf855' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      opacity: spiritStones >= 50 ? 1 : 0.45
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '18px' }}>💎</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
                          Linh Thạch (50 💎)
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#bae6fd', fontWeight: 700 }}>
                          +25 EXP Linh Thú
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onFeedMount && onFeedMount(selectedMount.id, 'spirit_stone', 1)}
                      disabled={spiritStones < 50}
                      style={{
                        background: spiritStones >= 50 ? '#38bdf833' : 'transparent',
                        border: `1px solid ${spiritStones >= 50 ? '#38bdf8' : '#64748b44'}`,
                        color: spiritStones >= 50 ? '#38bdf8' : '#64748b',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 900,
                        cursor: spiritStones >= 50 ? 'pointer' : 'not-allowed',
                        flexShrink: 0
                      }}
                    >
                      Cho Ăn
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              if (isOwned) {
                onToggleMount(selectedMount.id, selectedMount.name);
              }
            }}
            disabled={!isOwned}
            style={{
              width: '100%',
              background: isEquipped
                ? '#c084fc'
                : isOwned
                ? 'linear-gradient(135deg,#a855f7,#7e22ce)'
                : 'rgba(50,50,50,0.4)',
              border: `1.5px solid ${isOwned ? '#d8b4fe' : 'transparent'}`,
              borderRadius: '12px',
              padding: '12px',
              color: isEquipped ? '#000' : isOwned ? '#fff' : '#64748b',
              fontWeight: 900,
              fontSize: '13px',
              cursor: isOwned ? 'pointer' : 'not-allowed',
              boxShadow: isOwned ? '0 0 20px rgba(168,85,247,0.4)' : 'none'
            }}
          >
            {isEquipped ? '🐴 ĐANG CƯỠI LINH THÚ NÀY' : isOwned ? '🐴 CƯỠI LINH THÚ NÀY' : '🔒 CHƯA SỞ HỮU LINH THÚ'}
          </button>
        </div>
      </div>
    </div>
  );
};
