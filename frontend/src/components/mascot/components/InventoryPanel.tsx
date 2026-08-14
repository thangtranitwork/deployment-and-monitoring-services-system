import React, { useState, useRef, useEffect } from 'react';
import { ItemId, HerbId, ForgeBoosterId, Inventory, ItemConfig } from '../types';
import { ITEM_CONFIG, HERB_CONFIG, RARITY_COLORS } from '../constants';

interface PillItemButtonProps {
  item: ItemConfig;
  qty: number;
  isTalismanActive: boolean;
  talismanCountdown: number;
  selectedForgeBooster: ForgeBoosterId;
  onConsumePill: (itemId: ItemId) => void;
}

const PillItemButton: React.FC<PillItemButtonProps> = ({
  item,
  qty,
  isTalismanActive,
  talismanCountdown,
  selectedForgeBooster,
  onConsumePill
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const qtyRef = useRef(qty);
  qtyRef.current = qty;

  const isTalismItem = item.isBuff;
  const isForgeBoosterItem = item.isForgeBooster;
  const isActiveTalisman = isTalismItem && isTalismanActive;
  const isSelectedBooster = isForgeBoosterItem && selectedForgeBooster === item.id && qty > 0;
  const disabled = qty === 0 || isActiveTalisman;

  const stopHold = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Consume 1 immediately
    onConsumePill(item.id);
    setIsPressing(true);

    // Buffs / Forge boosters are single-activate items
    if (isTalismItem || isForgeBoosterItem) {
      setIsPressing(false);
      return;
    }

    // Start holding interval for continuous pill consumption
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (qtyRef.current <= 0) {
          stopHold();
          return;
        }
        onConsumePill(item.id);
      }, 90);
    }, 280);
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={e => e.preventDefault()}
      disabled={disabled}
      title={`${item.description} • [Nhấn giữ để cắn liên tục ⚡]`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: isPressing
          ? 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(168,85,247,0.3))'
          : (isActiveTalisman || isSelectedBooster)
          ? 'rgba(253,224,71,0.15)'
          : disabled
          ? 'rgba(30,35,50,0.5)'
          : 'rgba(245,158,11,0.1)',
        border: `1.5px solid ${
          isPressing
            ? '#fde047'
            : (isActiveTalisman || isSelectedBooster)
            ? '#fde047aa'
            : disabled
            ? 'rgba(100,116,139,0.2)'
            : RARITY_COLORS[item.rarity] + '66'
        }`,
        borderRadius: '10px',
        padding: '6px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%',
        opacity: disabled && !isActiveTalisman ? 0.5 : 1,
        transition: 'transform 0.08s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        transform: isPressing ? 'scale(0.96)' : 'scale(1)',
        boxShadow: isPressing
          ? '0 0 20px rgba(253,224,71,0.6), inset 0 0 10px rgba(253,224,71,0.3)'
          : (isActiveTalisman || isSelectedBooster)
          ? '0 0 14px rgba(253,224,71,0.45)'
          : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      {item.iconImage ? (
        <img
          src={item.iconImage}
          alt={item.name}
          style={{
            width: '28px',
            height: '28px',
            objectFit: 'contain',
            flexShrink: 0,
            filter: isPressing ? 'drop-shadow(0 0 6px #fde047)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
          }}
        />
      ) : (
        <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.emoji}</span>
      )}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div
          style={{
            color: isPressing ? '#fde047' : RARITY_COLORS[item.rarity],
            fontWeight: 800,
            fontSize: '11.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {item.name}
          {isActiveTalisman && (
            <span
              style={{
                color: '#fde047',
                fontSize: '9px',
                marginLeft: '4px',
                background: 'rgba(253,224,71,0.2)',
                padding: '1px 4px',
                borderRadius: '4px'
              }}
            >
              ● DÙNG
            </span>
          )}
          {isSelectedBooster && (
            <span
              style={{
                color: '#fde047',
                fontSize: '9px',
                marginLeft: '4px',
                background: 'rgba(253,224,71,0.2)',
                padding: '1px 4px',
                borderRadius: '4px'
              }}
            >
              ● ĐANG CHỌN
            </span>
          )}
        </div>
        <div
          style={{
            color: '#94a3b8',
            fontSize: '10px',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {item.isBuff
            ? isActiveTalisman
              ? `⏱️ Còn ${Math.ceil(talismanCountdown / 60)}p${talismanCountdown % 60}s`
              : `+${(item.buffSuccessBonus || 0.25) * 100}% Độ Kiếp`
            : item.isForgeBooster
            ? `+${Math.round((item.forgeSuccessBonus || 0.20) * 100)}% Rèn Pháp Bảo`
            : `+${item.xpValue} Linh Lực`}
        </div>
      </div>
      <div
        style={{
          background: qty > 0 ? (isPressing ? 'rgba(234,179,8,0.4)' : RARITY_COLORS[item.rarity] + '33') : 'rgba(100,116,139,0.2)',
          color: qty > 0 ? (isPressing ? '#fde047' : RARITY_COLORS[item.rarity]) : '#94a3b8',
          border: `1px solid ${qty > 0 ? (isPressing ? '#fde047' : RARITY_COLORS[item.rarity] + '66') : 'transparent'}`,
          borderRadius: '8px',
          padding: '2px 8px',
          fontSize: '11.5px',
          fontWeight: 800,
          flexShrink: 0
        }}
      >
        {qty}
      </div>
    </button>
  );
};

export const InventoryPanel: React.FC<{
  isOpen: boolean;
  inventory: Inventory;
  herbsInventory: Record<HerbId, number>;
  spiritStones: number;
  selectedForgeBooster: ForgeBoosterId;
  isTalismanActive: boolean;
  talismanCountdown: number;
  onConsumePill: (itemId: ItemId) => void;
}> = ({
  isOpen,
  inventory,
  herbsInventory,
  spiritStones,
  selectedForgeBooster,
  isTalismanActive,
  talismanCountdown,
  onConsumePill
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="mascot-inventory"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '12px',
        background: 'rgba(10,13,22,0.98)',
        border: '1.5px solid rgba(245,158,11,0.5)',
        borderRadius: '18px',
        padding: '16px 18px',
        width: 'min(640px, calc(100vw - 24px))',
        zIndex: 200,
        boxShadow: '0 12px 48px rgba(0,0,0,0.9), 0 0 20px rgba(245,158,11,0.2)',
        backdropFilter: 'blur(20px)'
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        style={{
          color: '#fbbf24',
          fontWeight: 900,
          fontSize: '13px',
          marginBottom: '10px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(245,158,11,0.25)',
          paddingBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <img
            src="/items/43_can_khon_tui.png"
            alt="Túi Trữ Vật"
            style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.7))' }}
          />
          <span>TÚI TRỮ VẬT TIÊN GIA</span>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: '#38bdf8',
            fontWeight: 800,
            background: 'rgba(56,189,248,0.12)',
            padding: '3px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(56,189,248,0.3)'
          }}
        >
          💎 {spiritStones} Linh Thạch
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}
      >
        <div
          style={{
            color: '#fde68a',
            fontWeight: 800,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          💊 Linh Đan Đã Tích Nạp
        </div>
        <span style={{ fontSize: '10px', color: '#fde047', fontWeight: 600 }}>
          ⚡ Nhấn giữ để cắn đan liên tục
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          maxHeight: '240px',
          overflowY: 'auto',
          paddingRight: '2px'
        }}
      >
        {ITEM_CONFIG.map(item => {
          const qty = inventory[item.id] || 0;
          return (
            <PillItemButton
              key={item.id}
              item={item}
              qty={qty}
              isTalismanActive={isTalismanActive}
              talismanCountdown={talismanCountdown}
              selectedForgeBooster={selectedForgeBooster}
              onConsumePill={onConsumePill}
            />
          );
        })}
      </div>

      {/* Dược Liệu & Quặng Tiên Gia section */}
      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(245,158,11,0.2)', paddingTop: '10px' }}>
        <div
          style={{
            color: '#6ee7b7',
            fontWeight: 800,
            fontSize: '11px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          🌿 Kho Dược Liệu & Quặng (Dùng Luyện Đan)
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            maxHeight: '200px',
            overflowY: 'auto',
            paddingRight: '2px'
          }}
        >
          {HERB_CONFIG.map(herb => {
            const count = herbsInventory[herb.id] || 0;
            return (
              <div
                key={herb.id}
                title={herb.description}
                style={{
                  background: count > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${count > 0 ? '#10b98166' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '8px',
                  padding: '5px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: count > 0 ? 1 : 0.45,
                  minWidth: 0,
                  gap: '4px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    overflow: 'hidden',
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  {herb.iconImage ? (
                    <img
                      src={herb.iconImage}
                      alt={herb.name}
                      style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }}
                    />
                  ) : (
                    <span style={{ fontSize: '12px', flexShrink: 0 }}>{herb.emoji}</span>
                  )}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: RARITY_COLORS[herb.rarity],
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {herb.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 900,
                    color: count > 0 ? '#86efac' : '#64748b',
                    marginLeft: '2px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '8px' }}>
        <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div>
            💎 <strong style={{ color: '#38bdf8' }}>Linh Thạch:</strong> Quay rương Gacha Thần Thú & Rèn Pháp Bảo
          </div>
          <div>
            🌿 <strong style={{ color: '#6ee7b7' }}>Dược Liệu & Quặng:</strong> Rớt tối đa 1 loại / 1 phút bế quan (có tỉ lệ trượt)
          </div>
          <div>
            🧪 <strong style={{ color: '#f59e0b' }}>Lò Bát Quái:</strong> Dùng Dược Liệu chế đan dược & Hộ Kiếp Phù
          </div>
        </div>
      </div>
    </div>
  );
};
