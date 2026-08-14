import React, { useState } from 'react';
import { HerbId, ItemId, Inventory } from '../types';
import { HERB_CONFIG, ITEM_CONFIG, FOOD_CONFIG, RARITY_COLORS } from '../constants';
import { ShoppingBag, Coins, BookOpen } from 'lucide-react';

export const MarketTab: React.FC<{
  spiritStones: number;
  herbsInventory: Record<string, number>;
  inventory: Inventory;
  onBuyMaterial: (herbId: any, amount: number) => void;
  onSellMaterial: (herbId: any, amount: number) => void;
  onBuyItem: (itemId: ItemId, amount: number) => void;
  onSellItem: (itemId: ItemId, amount: number) => void;
}> = ({
  spiritStones,
  herbsInventory,
  inventory,
  onBuyMaterial,
  onSellMaterial,
  onBuyItem,
  onSellItem
}) => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [selectedTradeKey, setSelectedTradeKey] = useState<string>('herb_lingzhi');
  const [tradeAmount, setTradeAmount] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'herb' | 'food' | 'item'>('all');

  // Combine herbs, foods and buyable/sellable pills/items
  const allTradeItems: Array<{
    kind: 'herb' | 'food' | 'item';
    id: string;
    name: string;
    emoji: string;
    iconImage?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
    description: string;
    buyPrice: number;
    sellPrice: number;
    owned: number;
  }> = [
    ...HERB_CONFIG.map(h => ({
      kind: 'herb' as const,
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      iconImage: h.iconImage,
      rarity: h.rarity,
      description: h.description,
      buyPrice: h.buyPrice,
      sellPrice: h.sellPrice,
      owned: herbsInventory[h.id] || 0
    })),
    ...FOOD_CONFIG.map(f => ({
      kind: 'food' as const,
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      iconImage: f.iconImage,
      rarity: f.rarity,
      description: f.description,
      buyPrice: f.buyPrice,
      sellPrice: f.sellPrice,
      owned: herbsInventory[f.id] || 0
    })),
    ...ITEM_CONFIG.filter(i => i.buyPrice || i.sellPrice).map(i => ({
      kind: 'item' as const,
      id: i.id,
      name: i.name,
      emoji: i.emoji,
      iconImage: i.iconImage,
      rarity: i.rarity,
      description: i.description,
      buyPrice: i.buyPrice || 100,
      sellPrice: i.sellPrice || 50,
      owned: inventory[i.id as keyof Inventory] || 0
    }))
  ];

  const selectedItem = allTradeItems.find(i => i.id === selectedTradeKey) || allTradeItems[0];

  const unitPrice = mode === 'buy' ? selectedItem.buyPrice : selectedItem.sellPrice;
  const totalPrice = unitPrice * tradeAmount;

  const canExecute = mode === 'buy' ? spiritStones >= totalPrice : selectedItem.owned >= tradeAmount;

  const maxAffordBuy = Math.max(1, Math.floor(spiritStones / selectedItem.buyPrice));
  const maxAffordSell = Math.max(1, selectedItem.owned);

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Phổ Thông';
      case 'uncommon': return 'Hiếm Hạp';
      case 'rare': return 'Trân Quý';
      case 'legendary': return 'Truyền Thuyết';
      case 'supreme': return 'Chí Bảo Thái Cổ';
      default: return 'Linh Vật';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '14px', height: '460px' }}>
      {/* ─── LEFT COLUMN: Master List ────────────────────────────────────────── */}
      <div
        style={{
          width: '260px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#f59e0b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            🏪 PHƯỜNG THỊ TU CHÂN
          </span>
          <span style={{ fontSize: '10.5px', color: '#fde047', fontWeight: 900 }}>💎 {spiritStones}</span>
        </div>

        {/* Buy / Sell Toggle Mode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
          <button
            onClick={() => {
              setMode('buy');
              setTradeAmount(1);
            }}
            style={{
              background: mode === 'buy' ? 'rgba(245,158,11,0.25)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${mode === 'buy' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
              color: mode === 'buy' ? '#fde68a' : '#94a3b8',
              borderRadius: '8px',
              padding: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <ShoppingBag style={{ width: '13px', height: '13px' }} /> Mua Đồ 🛒
          </button>
          <button
            onClick={() => {
              setMode('sell');
              setTradeAmount(1);
            }}
            style={{
              background: mode === 'sell' ? 'rgba(16,185,129,0.25)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${mode === 'sell' ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
              color: mode === 'sell' ? '#86efac' : '#94a3b8',
              borderRadius: '8px',
              padding: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Coins style={{ width: '13px', height: '13px' }} /> Bán Đồ 💰
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
          <input
            type="text"
            placeholder="🔍 Tìm sản phẩm (đan, thức ăn, thảo dược)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(245,158,11,0.28)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {[
            { key: 'all', label: 'Tất Cả' },
            { key: 'herb', label: '🌿 Thảo Dược' },
            { key: 'food', label: '🍱 Thức Ăn' },
            { key: 'item', label: '💊 Đan Dược' }
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key as any)}
              style={{
                background: filterCategory === cat.key ? 'rgba(245,158,11,0.25)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${filterCategory === cat.key ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                color: filterCategory === cat.key ? '#fde68a' : '#94a3b8',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {allTradeItems
          .filter(item => {
            const matchesCat = filterCategory === 'all' || item.kind === filterCategory;
            const matchesSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
          })
          .map(item => {
          const isSelected = selectedTradeKey === item.id;
          const displayPrice = mode === 'buy' ? item.buyPrice : item.sellPrice;

          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedTradeKey(item.id);
                setTradeAmount(1);
              }}
              style={{
                padding: '9px 11px',
                borderRadius: '10px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isSelected
                  ? mode === 'buy'
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(168,85,247,0.25))'
                    : 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(245,158,11,0.25))'
                  : 'rgba(0,0,0,0.25)',
                border: `1px solid ${
                  isSelected
                    ? mode === 'buy' ? '#f59e0b' : '#10b981'
                    : 'rgba(255,255,255,0.06)'
                }`,
                color: isSelected ? '#fde68a' : '#e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${RARITY_COLORS[item.rarity]}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {item.iconImage ? (
                    <img src={item.iconImage} alt={item.name} style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: isSelected ? '#fde047' : RARITY_COLORS[item.rarity],
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    Có: <strong style={{ color: '#86efac' }}>{item.owned}</strong> • Giá: 💎 {displayPrice}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── RIGHT COLUMN: Detail & Action Panel ─────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: 'rgba(15,23,42,0.6)',
          border: `1px solid ${RARITY_COLORS[selectedItem.rarity]}44`,
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: `0 0 25px ${RARITY_COLORS[selectedItem.rarity]}15`,
          overflowY: 'auto'
        }}
      >
        <div>
          {/* Item Header Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(0,0,0,0.6) 80%)',
                border: `1.5px solid ${RARITY_COLORS[selectedItem.rarity]}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {selectedItem.iconImage ? (
                <img src={selectedItem.iconImage} alt={selectedItem.name} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '40px' }}>{selectedItem.emoji}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 900, fontSize: '17px', color: RARITY_COLORS[selectedItem.rarity] }}>
                  {selectedItem.name}
                </span>
                <span style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid #f59e0b66', color: '#fde047', fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px' }}>
                  Phẩm cấp: {getRarityLabel(selectedItem.rarity)}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#86efac', marginTop: '4px', fontWeight: 800 }}>
                🎒 Số lượng đang có trong kho: {selectedItem.owned}x
              </div>
            </div>
          </div>

          {/* Item Specific Lore Data Box */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#f59e0b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen style={{ width: '13px', height: '13px' }} /> 📜 ĐIỂN TÍCH & ĐẶC TÍNH NGUYÊN LIỆU:
            </div>
            <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.6' }}>
              {selectedItem.description}
            </div>
          </div>

          {/* Pricing Specs Box */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '5px' }}>
              <span style={{ color: '#cbd5e1' }}>Đơn Giá {mode === 'buy' ? 'Mua Phường Thị' : 'Bán Đổi Linh Thạch'}:</span>
              <span style={{ color: '#fde047', fontWeight: 800 }}>💎 {unitPrice.toLocaleString()} Linh Thạch / cái</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '5px' }}>
              <span style={{ color: '#cbd5e1' }}>Số Lượng {mode === 'buy' ? 'Mua' : 'Bán'}:</span>
              <span style={{ color: '#86efac', fontWeight: 900 }}>{tradeAmount}x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', paddingTop: '5px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#fff', fontWeight: 800 }}>Tổng {mode === 'buy' ? 'Chi Trả' : 'Thu Về'}:</span>
              <span style={{ color: mode === 'buy' ? (canExecute ? '#fde047' : '#ef4444') : '#86efac', fontWeight: 900 }}>
                💎 {totalPrice.toLocaleString()} Linh Thạch
              </span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 800 }}>Chọn số lượng giao dịch:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 5, 10].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setTradeAmount(cnt)}
                  style={{
                    background: tradeAmount === cnt ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${tradeAmount === cnt ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                    color: tradeAmount === cnt ? '#fde68a' : '#94a3b8',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {cnt}x
                </button>
              ))}
              <button
                onClick={() => setTradeAmount(mode === 'buy' ? maxAffordBuy : maxAffordSell)}
                style={{
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid #10b981',
                  color: '#86efac',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Max ({mode === 'buy' ? maxAffordBuy : maxAffordSell}x)
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => {
            if (canExecute) {
              if (selectedItem.kind === 'herb') {
                if (mode === 'buy') onBuyMaterial(selectedItem.id as HerbId, tradeAmount);
                else onSellMaterial(selectedItem.id as HerbId, tradeAmount);
              } else {
                if (mode === 'buy') onBuyItem(selectedItem.id as ItemId, tradeAmount);
                else onSellItem(selectedItem.id as ItemId, tradeAmount);
              }
            }
          }}
          disabled={!canExecute}
          style={{
            width: '100%',
            background: canExecute
              ? mode === 'buy'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #10b981, #059669)'
              : 'rgba(50,50,50,0.4)',
            border: `1.5px solid ${canExecute ? (mode === 'buy' ? '#fde047' : '#86efac') : 'transparent'}`,
            borderRadius: '12px',
            padding: '13px',
            color: canExecute ? (mode === 'buy' ? '#000' : '#fff') : '#64748b',
            fontWeight: 900,
            fontSize: '13.5px',
            cursor: canExecute ? 'pointer' : 'not-allowed',
            boxShadow: canExecute ? `0 0 20px ${mode === 'buy' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {mode === 'buy' ? <ShoppingBag style={{ width: '18px', height: '18px' }} /> : <Coins style={{ width: '18px', height: '18px' }} />}
          {canExecute
            ? mode === 'buy'
              ? `🛒 MUA ${tradeAmount}X ${selectedItem.name.toUpperCase()} (${totalPrice.toLocaleString()} 💎)`
              : `💰 BÁN ${tradeAmount}X ${selectedItem.name.toUpperCase()} (+${totalPrice.toLocaleString()} 💎)`
            : mode === 'buy' ? '🔒 KHÔNG ĐỦ LINH THẠCH' : '🔒 KHÔNG ĐỦ HÀNG TRONG KHO'}
        </button>
      </div>
    </div>
  );
};
