import React, { useState } from 'react';
import { HerbId, ItemId } from '../types';
import { HERB_CONFIG, ITEM_CONFIG, RARITY_COLORS } from '../constants';

interface MarketTabProps {
  spiritStones: number;
  herbsInventory: Record<HerbId, number>;
  inventory: Partial<Record<ItemId, number>>;
  onBuyMaterial: (herbId: HerbId, amount: number) => void;
  onSellMaterial: (herbId: HerbId, amount: number) => void;
  onBuyItem?: (itemId: ItemId, amount: number) => void;
  onSellItem?: (itemId: ItemId, amount: number) => void;
}

export const MarketTab: React.FC<MarketTabProps> = ({
  spiritStones,
  herbsInventory,
  inventory,
  onBuyMaterial,
  onSellMaterial,
  onBuyItem,
  onSellItem
}) => {
  const [marketMode, setMarketMode] = useState<'buy' | 'sell'>('buy');
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme'>('all');
  const [tradeCategory, setTradeCategory] = useState<'herbs' | 'pills'>('herbs');

  // Filtered materials
  const filteredHerbs = HERB_CONFIG.filter(h => rarityFilter === 'all' || h.rarity === rarityFilter);
  const filteredItems = ITEM_CONFIG.filter(i => rarityFilter === 'all' || i.rarity === rarityFilter);

  // Items owned with qty > 0 for selling
  const ownedHerbsToSell = HERB_CONFIG.filter(h => (herbsInventory[h.id] || 0) > 0);
  const ownedItemsToSell = ITEM_CONFIG.filter(i => (inventory[i.id] || 0) > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Banner & Wallet */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(168,85,247,0.15))',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          boxShadow: '0 0 20px rgba(234,179,8,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🏪</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: '13px', color: '#fde047', letterSpacing: '0.04em' }}>
              PHƯỜNG THỊ TU CHÂN • VẠN BẢO LÂU
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Nơi giao thương Linh Dược, Kỳ Quặng & Đan Dược giữa các tu sĩ
            </div>
          </div>
        </div>

        {/* Spirit Stones Balance Display */}
        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1.5px solid #fde04788',
            borderRadius: '10px',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 12px rgba(253,224,71,0.25)'
          }}
        >
          <span style={{ fontSize: '16px' }}>💎</span>
          <span style={{ fontWeight: 900, fontSize: '13px', color: '#fde047', fontFamily: 'monospace' }}>
            {spiritStones.toLocaleString()}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Linh Thạch</span>
        </div>
      </div>

      {/* Mode Switcher & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        {/* Buy / Sell Mode Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <button
            onClick={() => setMarketMode('buy')}
            style={{
              background: marketMode === 'buy' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: marketMode === 'buy' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '7px',
              padding: '5px 14px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
          >
            🛒 Mua Sắm
          </button>
          <button
            onClick={() => setMarketMode('sell')}
            style={{
              background: marketMode === 'sell' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: marketMode === 'sell' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '7px',
              padding: '5px 14px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
          >
            💰 Thu Mua (Bán)
          </button>
        </div>

        {/* Category: Herbs vs Pills */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <button
            onClick={() => setTradeCategory('herbs')}
            style={{
              background: tradeCategory === 'herbs' ? 'rgba(56,189,248,0.25)' : 'transparent',
              color: tradeCategory === 'herbs' ? '#38bdf8' : '#94a3b8',
              border: tradeCategory === 'herbs' ? '1px solid #38bdf866' : '1px solid transparent',
              borderRadius: '7px',
              padding: '4px 10px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🌿 Dược Liệu & Quặng
          </button>
          <button
            onClick={() => setTradeCategory('pills')}
            style={{
              background: tradeCategory === 'pills' ? 'rgba(192,132,252,0.25)' : 'transparent',
              color: tradeCategory === 'pills' ? '#c084fc' : '#94a3b8',
              border: tradeCategory === 'pills' ? '1px solid #c084fc66' : '1px solid transparent',
              borderRadius: '7px',
              padding: '4px 10px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            💊 Đan Dược & Phù Chú
          </button>
        </div>

        {/* Rarity Filter */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(['all', 'common', 'uncommon', 'rare', 'legendary', 'supreme'] as const).map(rarity => (
            <button
              key={rarity}
              onClick={() => setRarityFilter(rarity)}
              style={{
                background: rarityFilter === rarity ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${rarity === 'all' ? '#94a3b844' : RARITY_COLORS[rarity] + '55'}`,
                color: rarity === 'all' ? '#cbd5e1' : RARITY_COLORS[rarity],
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '9.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {rarity === 'all' ? 'Tất cả' : rarity.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ─── BUY MODE ──────────────────────────────────────────────────────── */}
      {marketMode === 'buy' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '10px',
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {tradeCategory === 'herbs' ? (
            filteredHerbs.map(herb => {
              const owned = herbsInventory[herb.id] || 0;
              const canBuy1 = spiritStones >= herb.buyPrice;
              const canBuy5 = spiritStones >= herb.buyPrice * 5;
              const canBuy10 = spiritStones >= herb.buyPrice * 10;

              return (
                <div
                  key={herb.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${RARITY_COLORS[herb.rarity]}44`,
                    borderRadius: '10px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: `0 0 10px ${RARITY_COLORS[herb.rarity]}15`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${RARITY_COLORS[herb.rarity]}66`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {herb.iconImage ? (
                        <img src={herb.iconImage} alt={herb.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '20px' }}>{herb.emoji}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '11.5px', color: RARITY_COLORS[herb.rarity], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {herb.name}
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                        Đang có: <span style={{ color: '#86efac', fontWeight: 700 }}>{owned}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '9.5px', color: '#cbd5e1', lineHeight: '1.3', minHeight: '24px' }}>
                    {herb.description}
                  </div>

                  {/* Price & Buy Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fde047', fontWeight: 800, fontSize: '11px' }}>
                      <span>💎</span>
                      <span>{herb.buyPrice}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => onBuyMaterial(herb.id, 1)}
                        disabled={!canBuy1}
                        style={{
                          background: canBuy1 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${canBuy1 ? '#10b981' : '#64748b44'}`,
                          color: canBuy1 ? '#86efac' : '#64748b',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: canBuy1 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        +1
                      </button>
                      <button
                        onClick={() => onBuyMaterial(herb.id, 5)}
                        disabled={!canBuy5}
                        style={{
                          background: canBuy5 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${canBuy5 ? '#10b981' : '#64748b44'}`,
                          color: canBuy5 ? '#86efac' : '#64748b',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: canBuy5 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        +5
                      </button>
                      <button
                        onClick={() => onBuyMaterial(herb.id, 10)}
                        disabled={!canBuy10}
                        style={{
                          background: canBuy10 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${canBuy10 ? '#10b981' : '#64748b44'}`,
                          color: canBuy10 ? '#86efac' : '#64748b',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: canBuy10 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            filteredItems.map(item => {
              const owned = inventory[item.id] || 0;
              const buyPrice = item.buyPrice || 100;
              const canBuy1 = spiritStones >= buyPrice;
              const canBuy5 = spiritStones >= buyPrice * 5;

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${RARITY_COLORS[item.rarity]}44`,
                    borderRadius: '10px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: `0 0 10px ${RARITY_COLORS[item.rarity]}15`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${RARITY_COLORS[item.rarity]}66`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {item.iconImage ? (
                        <img src={item.iconImage} alt={item.name} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '11.5px', color: RARITY_COLORS[item.rarity], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                        Đang có: <span style={{ color: '#86efac', fontWeight: 700 }}>{owned}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '9.5px', color: '#cbd5e1', lineHeight: '1.3', minHeight: '24px' }}>
                    {item.description}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fde047', fontWeight: 800, fontSize: '11px' }}>
                      <span>💎</span>
                      <span>{buyPrice}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => onBuyItem && onBuyItem(item.id, 1)}
                        disabled={!canBuy1}
                        style={{
                          background: canBuy1 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${canBuy1 ? '#10b981' : '#64748b44'}`,
                          color: canBuy1 ? '#86efac' : '#64748b',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: canBuy1 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        +1
                      </button>
                      <button
                        onClick={() => onBuyItem && onBuyItem(item.id, 5)}
                        disabled={!canBuy5}
                        style={{
                          background: canBuy5 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${canBuy5 ? '#10b981' : '#64748b44'}`,
                          color: canBuy5 ? '#86efac' : '#64748b',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: canBuy5 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── SELL MODE ─────────────────────────────────────────────────────── */}
      {marketMode === 'sell' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '10px',
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {tradeCategory === 'herbs' ? (
            ownedHerbsToSell.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                🌾 Không có Dược Liệu / Quặng nào trong túi để bán. Hãy treo máy hoặc mua ở tiệm!
              </div>
            ) : (
              ownedHerbsToSell.map(herb => {
                const owned = herbsInventory[herb.id] || 0;
                const sellPrice = herb.sellPrice;

                return (
                  <div
                    key={herb.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${RARITY_COLORS[herb.rarity]}44`,
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: `1px solid ${RARITY_COLORS[herb.rarity]}66`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {herb.iconImage ? (
                          <img src={herb.iconImage} alt={herb.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '20px' }}>{herb.emoji}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '11.5px', color: RARITY_COLORS[herb.rarity], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {herb.name}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                          Số lượng: <span style={{ color: '#fde047', fontWeight: 800 }}>{owned}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sell Price & Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#86efac', fontWeight: 800, fontSize: '11px' }}>
                        <span>+💎</span>
                        <span>{sellPrice}</span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 400 }}>/ cái</span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => onSellMaterial(herb.id, 1)}
                          disabled={owned < 1}
                          style={{
                            background: 'rgba(245,158,11,0.15)',
                            border: '1px solid #f59e0b88',
                            color: '#fde68a',
                            borderRadius: '6px',
                            padding: '3px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Bán 1
                        </button>
                        {owned >= 5 && (
                          <button
                            onClick={() => onSellMaterial(herb.id, 5)}
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              border: '1px solid #f59e0b88',
                              color: '#fde68a',
                              borderRadius: '6px',
                              padding: '3px 7px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Bán 5
                          </button>
                        )}
                        <button
                          onClick={() => onSellMaterial(herb.id, owned)}
                          style={{
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid #ef444488',
                            color: '#fca5a5',
                            borderRadius: '6px',
                            padding: '3px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Tất Cả
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            ownedItemsToSell.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                💊 Không có Đan Dược / Phù Chú nào trong túi để bán.
              </div>
            ) : (
              ownedItemsToSell.map(item => {
                const owned = inventory[item.id] || 0;
                const sellPrice = item.sellPrice || 10;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${RARITY_COLORS[item.rarity]}44`,
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: `1px solid ${RARITY_COLORS[item.rarity]}66`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {item.iconImage ? (
                          <img src={item.iconImage} alt={item.name} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '11.5px', color: RARITY_COLORS[item.rarity], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                          Số lượng: <span style={{ color: '#fde047', fontWeight: 800 }}>{owned}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#86efac', fontWeight: 800, fontSize: '11px' }}>
                        <span>+💎</span>
                        <span>{sellPrice}</span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 400 }}>/ cái</span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => onSellItem && onSellItem(item.id, 1)}
                          disabled={owned < 1}
                          style={{
                            background: 'rgba(245,158,11,0.15)',
                            border: '1px solid #f59e0b88',
                            color: '#fde68a',
                            borderRadius: '6px',
                            padding: '3px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Bán 1
                        </button>
                        {owned >= 5 && (
                          <button
                            onClick={() => onSellItem && onSellItem(item.id, 5)}
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              border: '1px solid #f59e0b88',
                              color: '#fde68a',
                              borderRadius: '6px',
                              padding: '3px 7px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Bán 5
                          </button>
                        )}
                        <button
                          onClick={() => onSellItem && onSellItem(item.id, owned)}
                          style={{
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid #ef444488',
                            color: '#fca5a5',
                            borderRadius: '6px',
                            padding: '3px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Tất Cả
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      )}
    </div>
  );
};
