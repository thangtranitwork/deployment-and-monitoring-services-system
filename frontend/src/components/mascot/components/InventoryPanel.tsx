import React, { useState, useRef, useEffect } from "react";
import { ItemId, HerbId, ForgeBoosterId, Inventory, ItemConfig, HerbConfig, FoodConfig } from "../types";
import { ITEM_CONFIG, HERB_CONFIG, FOOD_CONFIG, RARITY_COLORS } from "../constants";
import { Flame, Utensils } from "lucide-react";

interface PillSlotProps {
  item: ItemConfig;
  qty: number;
  isSpecificActive: boolean;
  selectedForgeBooster: ForgeBoosterId;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onConsumePill: (itemId: ItemId) => void;
}

const PillSlot: React.FC<PillSlotProps> = ({
  item,
  qty,
  isSpecificActive,
  selectedForgeBooster,
  isHovered,
  onHover,
  onLeave,
  onConsumePill
}) => {
  const [imgError, setImgError] = useState(false);
  const disabled = qty === 0;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopHold = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onHover();
    onConsumePill(item.id);

    if (item.isBuff || item.isForgeBooster) return;

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onConsumePill(item.id);
      }, 90);
    }, 280);
  };

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: "10px",
        background: isHovered
          ? "radial-gradient(circle, rgba(245,158,11,0.28) 0%, rgba(15,23,42,0.95) 100%)"
          : isSpecificActive
          ? "radial-gradient(circle, rgba(253,224,71,0.22) 0%, rgba(10,13,22,0.95) 100%)"
          : "radial-gradient(circle, rgba(30,41,59,0.5) 0%, rgba(10,13,22,0.95) 100%)",
        border: `1.5px solid ${
          isHovered
            ? "#fde047"
            : isSpecificActive
            ? "#fde047"
            : disabled
            ? "rgba(255,255,255,0.06)"
            : `${RARITY_COLORS[item.rarity]}66`
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: isHovered
          ? "0 0 14px rgba(253,224,71,0.5)"
          : isSpecificActive
          ? "0 0 10px rgba(253,224,71,0.35)"
          : "none",
        transition: "all 0.15s ease",
        transform: isHovered ? "scale(1.08)" : "scale(1)",
        opacity: disabled ? 0.4 : 1,
        userSelect: "none"
      }}
    >
      {item.iconImage && !imgError ? (
        <img
          src={item.iconImage}
          alt={item.name}
          onError={() => setImgError(true)}
          style={{
            width: "28px",
            height: "28px",
            objectFit: "contain",
            filter: isHovered ? "drop-shadow(0 0 6px #fde047)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
          }}
        />
      ) : (
        <span style={{ fontSize: "20px" }}>{item.emoji}</span>
      )}

      {isSpecificActive && (
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: "2px",
            background: "#fde047",
            color: "#000",
            fontSize: "7.5px",
            fontWeight: 900,
            padding: "1px 3px",
            borderRadius: "3px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.8)"
          }}
        >
          DÙNG
        </span>
      )}

      <span
        style={{
          position: "absolute",
          bottom: "2px",
          right: "2px",
          background: "rgba(0,0,0,0.85)",
          color: qty > 0 ? (isHovered ? "#fde047" : RARITY_COLORS[item.rarity]) : "#64748b",
          border: `1px solid ${qty > 0 ? `${RARITY_COLORS[item.rarity]}66` : "rgba(255,255,255,0.08)"}`,
          fontSize: "9px",
          fontWeight: 900,
          padding: "0.5px 4px",
          borderRadius: "4px"
        }}
      >
        {qty}
      </span>
    </div>
  );
};

const FoodSlot: React.FC<{
  food: FoodConfig;
  count: number;
  isHovered: boolean;
  onHover: () => void;
  onFeedMount?: (foodId: string, amount: number) => void;
}> = ({ food, count, isHovered, onHover, onFeedMount }) => {
  const [imgError, setImgError] = useState(false);
  const disabled = count === 0;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopHold = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onHover();
    if (onFeedMount) onFeedMount(food.id, 1);

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (onFeedMount) onFeedMount(food.id, 1);
      }, 90);
    }, 280);
  };

  return (
    <div
      onMouseEnter={onHover}
      onPointerDown={handlePointerDown}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: "10px",
        background: isHovered
          ? "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(10,13,22,0.95) 100%)"
          : count > 0
          ? "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(10,13,22,0.95) 100%)"
          : "rgba(0,0,0,0.3)",
        border: `1.5px solid ${
          isHovered
            ? "#86efac"
            : count > 0
            ? `${RARITY_COLORS[food.rarity]}66`
            : "rgba(255,255,255,0.06)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: count > 0 ? 1 : 0.4,
        transition: "all 0.15s ease",
        transform: isHovered ? "scale(1.08)" : "scale(1)",
        userSelect: "none"
      }}
    >
      {food.iconImage && !imgError ? (
        <img
          src={food.iconImage}
          alt={food.name}
          onError={() => setImgError(true)}
          style={{ width: "28px", height: "28px", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
        />
      ) : (
        <span style={{ fontSize: "20px" }}>{food.emoji}</span>
      )}

      <span
        style={{
          position: "absolute",
          bottom: "2px",
          right: "2px",
          background: "rgba(0,0,0,0.85)",
          color: count > 0 ? "#86efac" : "#64748b",
          fontSize: "9px",
          fontWeight: 900,
          padding: "0.5px 4px",
          borderRadius: "4px"
        }}
      >
        {count}
      </span>
    </div>
  );
};

const HerbSlot: React.FC<{
  herb: HerbConfig;
  count: number;
  isHovered: boolean;
  onHover: () => void;
}> = ({ herb, count, isHovered, onHover }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={onHover}
      onClick={onHover}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: "10px",
        background: isHovered
          ? "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(10,13,22,0.95) 100%)"
          : count > 0
          ? "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(10,13,22,0.95) 100%)"
          : "rgba(0,0,0,0.3)",
        border: `1.5px solid ${
          isHovered
            ? "#86efac"
            : count > 0
            ? `${RARITY_COLORS[herb.rarity]}66`
            : "rgba(255,255,255,0.06)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: count > 0 ? 1 : 0.4,
        transition: "all 0.15s ease",
        transform: isHovered ? "scale(1.08)" : "scale(1)"
      }}
    >
      {herb.iconImage && !imgError ? (
        <img
          src={herb.iconImage}
          alt={herb.name}
          onError={() => setImgError(true)}
          style={{ width: "28px", height: "28px", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
        />
      ) : (
        <span style={{ fontSize: "20px" }}>{herb.emoji}</span>
      )}

      <span
        style={{
          position: "absolute",
          bottom: "2px",
          right: "2px",
          background: "rgba(0,0,0,0.85)",
          color: count > 0 ? "#86efac" : "#64748b",
          fontSize: "9px",
          fontWeight: 900,
          padding: "0.5px 4px",
          borderRadius: "4px"
        }}
      >
        {count}
      </span>
    </div>
  );
};

export const InventoryPanel: React.FC<{
  isOpen: boolean;
  inventory: Inventory;
  herbsInventory: Record<string, number>;
  spiritStones: number;
  selectedForgeBooster: ForgeBoosterId;
  isTalismanActive: boolean;
  talismanCountdown: number;
  activeRealmPillId?: string | null;
  realmPillExpiry?: number;
  reviveBuffExpiry?: number;
  voCucBuffExpiry?: number;
  activeMountId?: string | null;
  isReadyToBreakthrough?: boolean;
  onConsumePill: (itemId: ItemId) => void;
  onFeedMount?: (mountId: string, foodId: string, amount: number) => void;
}> = ({
  isOpen,
  inventory,
  herbsInventory,
  spiritStones,
  selectedForgeBooster,
  isTalismanActive,
  talismanCountdown,
  activeRealmPillId,
  realmPillExpiry = 0,
  reviveBuffExpiry = 0,
  voCucBuffExpiry = 0,
  activeMountId = "wolf",
  isReadyToBreakthrough = false,
  onConsumePill,
  onFeedMount
}) => {
  const visiblePills = ITEM_CONFIG.filter(item => {
    if (item.category === 'breakthrough' && !isReadyToBreakthrough) {
      return false;
    }
    return true;
  });

  const [hoveredItem, setHoveredItem] = useState<ItemConfig | null>(null);
  const [hoveredHerb, setHoveredHerb] = useState<HerbConfig | null>(null);
  const [hoveredFood, setHoveredFood] = useState<FoodConfig | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeItem = hoveredItem || visiblePills.find(i => (inventory[i.id] || 0) > 0) || visiblePills[0] || ITEM_CONFIG[0];
  const activeQty = inventory[activeItem.id] || 0;
  const isTalismItem = activeItem.isBuff;
  const isForgeBoosterItem = activeItem.isForgeBooster;
  const disabled = activeQty === 0;

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

  const handlePointerDownAction = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    onConsumePill(activeItem.id);
    setIsPressing(true);

    if (isTalismItem || isForgeBoosterItem) {
      setIsPressing(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onConsumePill(activeItem.id);
      }, 90);
    }, 280);
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="mascot-inventory"
      style={{
        position: "absolute",
        bottom: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginBottom: "12px",
        background: "rgba(10,13,22,0.98)",
        border: "1.5px solid rgba(245,158,11,0.5)",
        borderRadius: "18px",
        padding: "16px 18px",
        width: "min(780px, calc(100vw - 20px))",
        maxHeight: "min(780px, 85vh)",
        overflowY: "auto",
        zIndex: 200,
        boxShadow: "0 12px 48px rgba(0,0,0,0.9), 0 0 24px rgba(245,158,11,0.25)",
        backdropFilter: "blur(20px)",
        boxSizing: "border-box"
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div
        style={{
          color: "#fbbf24",
          fontWeight: 900,
          fontSize: "13px",
          marginBottom: "12px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(245,158,11,0.25)",
          paddingBottom: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <img
            src="/items/43_can_khon_tui.png"
            alt="Túi Trữ Vật"
            style={{ width: "22px", height: "22px", objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.7))" }}
          />
          <span>TÚI TRỮ VẬT TIÊN GIA</span>
        </div>
        <span
          style={{
            fontSize: "12px",
            color: "#38bdf8",
            fontWeight: 800,
            background: "rgba(56,189,248,0.12)",
            padding: "3px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(56,189,248,0.3)"
          }}
        >
          💎 {spiritStones} Linh Thạch
        </span>
      </div>

      {/* ─── HOVERED ITEM DETAIL CARD ────────────────── */}
      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          border: `1.5px solid ${
            hoveredFood
              ? RARITY_COLORS[hoveredFood.rarity]
              : hoveredHerb
              ? RARITY_COLORS[hoveredHerb.rarity]
              : RARITY_COLORS[activeItem.rarity]
          }66`,
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)"
        }}
      >
        {hoveredFood ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.5)",
                  border: `1px solid ${RARITY_COLORS[hoveredFood.rarity]}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {hoveredFood.iconImage ? (
                  <img src={hoveredFood.iconImage} alt={hoveredFood.name} style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: "24px" }}>{hoveredFood.emoji}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: "13.5px", color: RARITY_COLORS[hoveredFood.rarity] }}>
                  {hoveredFood.name} (Có: {herbsInventory[hoveredFood.id] || 0}x)
                </div>
                <div style={{ fontSize: "11px", color: "#86efac", fontWeight: 800, marginTop: "2px" }}>
                  +{hoveredFood.expValue} EXP Linh Thú • {hoveredFood.description}
                </div>
              </div>
            </div>
            <button
              onClick={() => onFeedMount && onFeedMount(activeMountId || "wolf", hoveredFood.id, 1)}
              disabled={(herbsInventory[hoveredFood.id] || 0) <= 0}
              style={{
                background: (herbsInventory[hoveredFood.id] || 0) > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(50,50,50,0.4)",
                border: "1px solid #86efac",
                borderRadius: "10px",
                padding: "8px 14px",
                color: "#fff",
                fontWeight: 900,
                fontSize: "11.5px",
                cursor: (herbsInventory[hoveredFood.id] || 0) > 0 ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap"
              }}
            >
              <Utensils style={{ width: "14px", height: "14px" }} />
              CHO LINH THÚ ĂN (+1)
            </button>
          </div>
        ) : hoveredHerb ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "10px",
                background: "rgba(0,0,0,0.5)",
                border: `1px solid ${RARITY_COLORS[hoveredHerb.rarity]}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {hoveredHerb.iconImage ? (
                <img src={hoveredHerb.iconImage} alt={hoveredHerb.name} style={{ width: "36px", height: "36px", objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: "24px" }}>{hoveredHerb.emoji}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: "13.5px", color: RARITY_COLORS[hoveredHerb.rarity] }}>
                {hoveredHerb.name} (Có: {herbsInventory[hoveredHerb.id] || 0}x)
              </div>
              <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px", lineHeight: "1.4" }}>
                {hoveredHerb.description}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.5)",
                  border: `1px solid ${RARITY_COLORS[activeItem.rarity]}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {activeItem.iconImage ? (
                  <img src={activeItem.iconImage} alt={activeItem.name} style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: "24px" }}>{activeItem.emoji}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 900, fontSize: "14px", color: RARITY_COLORS[activeItem.rarity] }}>
                    {activeItem.name}
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.08)", color: "#86efac", fontSize: "10px", fontWeight: 900, padding: "1px 6px", borderRadius: "4px" }}>
                    Có trong kho: {activeQty}x
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px", lineHeight: "1.4" }}>
                  {activeItem.description}
                </div>
              </div>
            </div>

            <button
              onPointerDown={handlePointerDownAction}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onContextMenu={e => e.preventDefault()}
              disabled={disabled}
              style={{
                background: disabled
                  ? "rgba(50,50,50,0.4)"
                  : isPressing
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : "linear-gradient(135deg, #10b981, #059669)",
                border: `1px solid ${disabled ? "transparent" : "#86efac"}`,
                borderRadius: "10px",
                padding: "8px 14px",
                color: disabled ? "#64748b" : "#fff",
                fontWeight: 900,
                fontSize: "11.5px",
                cursor: disabled ? "not-allowed" : "pointer",
                boxShadow: disabled ? "none" : "0 0 14px rgba(16,185,129,0.4)",
                flexShrink: 0,
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                userSelect: "none"
              }}
            >
              <Flame style={{ width: "14px", height: "14px" }} />
              {disabled ? "HẾT HÀNG" : "DÙNG ĐAN (NHẤN GIỮ)"}
            </button>
          </>
        )}
      </div>

      {/* ─── 12xN GRID: LINH ĐAN & PHỤ BẢO ──────────────────────────────────── */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#fde68a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            💊 LINH ĐAN & PHỤ BẢO (NHẤN / NHẤN GIỮ ICON ĐỂ CẮN ĐAN)
          </div>
          {isReadyToBreakthrough && (
            <span style={{ fontSize: "10px", fontWeight: 900, color: "#34d399", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)", padding: "1px 8px", borderRadius: "6px" }}>
              ⚡ CÁN MỐC ĐỘT PHÁ: ĐÃ MỞ ĐAN DƯỢC TĂNG TỈ LỆ
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "6px",
            maxHeight: "220px",
            overflowY: "auto",
            paddingRight: "2px",
            paddingBottom: "4px"
          }}
        >
          {visiblePills.map(item => {
            const qty = inventory[item.id] || 0;
            const isHovered = activeItem.id === item.id && !hoveredHerb && !hoveredFood;

            const isSpecificActive = Boolean(
              (item.id === "talisman" && isTalismanActive) ||
              (item.id === "revive" && Date.now() < reviveBuffExpiry) ||
              (item.id === "pill_vo_cuc" && Date.now() < voCucBuffExpiry) ||
              (item.id === activeRealmPillId && Date.now() < (realmPillExpiry || 0)) ||
              (item.isForgeBooster && selectedForgeBooster === item.id && qty > 0)
            );

            return (
              <PillSlot
                key={item.id}
                item={item}
                qty={qty}
                isSpecificActive={isSpecificActive}
                selectedForgeBooster={selectedForgeBooster}
                isHovered={isHovered}
                onHover={() => {
                  setHoveredHerb(null);
                  setHoveredFood(null);
                  setHoveredItem(item);
                }}
                onLeave={() => {}}
                onConsumePill={onConsumePill}
              />
            );
          })}
        </div>
      </div>

      {/* ─── 12xN GRID: THỨC ĂN LINH THÚ ──────────────────────────────────── */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", fontWeight: 900, color: "#86efac", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          🍱 THỨC ĂN LINH THÚ (NHẤN / NHẤN GIỮ ICON ĐỂ CHO LINH THÚ ĂN)
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "6px",
            maxHeight: "180px",
            overflowY: "auto",
            paddingRight: "2px",
            paddingBottom: "4px"
          }}
        >
          {FOOD_CONFIG.map(food => {
            const count = herbsInventory[food.id] || 0;
            const isHovered = hoveredFood?.id === food.id;

            return (
              <FoodSlot
                key={food.id}
                food={food}
                count={count}
                isHovered={isHovered}
                onHover={() => {
                  setHoveredHerb(null);
                  setHoveredItem(null);
                  setHoveredFood(food);
                }}
                onFeedMount={(foodId, amt) => onFeedMount && onFeedMount(activeMountId || "wolf", foodId, amt)}
              />
            );
          })}
        </div>
      </div>

      {/* ─── 12xN GRID: DƯỢC LIỆU & QUẶNG ──────────────────────────────────── */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 900, color: "#6ee7b7", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          🌿 DƯỢC LIỆU & QUẶNG THÁI CỔ (KHO NGUYÊN LIỆU)
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "6px",
            maxHeight: "160px",
            overflowY: "auto",
            paddingRight: "2px",
            paddingBottom: "4px"
          }}
        >
          {HERB_CONFIG.map(herb => {
            const count = herbsInventory[herb.id] || 0;
            const isHovered = hoveredHerb?.id === herb.id;

            return (
              <HerbSlot
                key={herb.id}
                herb={herb}
                count={count}
                isHovered={isHovered}
                onHover={() => {
                  setHoveredFood(null);
                  setHoveredItem(null);
                  setHoveredHerb(herb);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
