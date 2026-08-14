import React from 'react';
import { CraftingRecipe, HerbId, IngredientId, Inventory } from '../types';
import { CRAFTING_RECIPES, RARITY_COLORS, ITEM_CONFIG, HERB_CONFIG } from '../constants';

export const CraftingTab: React.FC<{
  spiritStones: number;
  inventory: Inventory;
  herbsInventory: Record<HerbId, number>;
  onCraftPill: (recipe: CraftingRecipe, count: number) => void;
}> = ({ spiritStones, inventory, herbsInventory, onCraftPill }) => {
  const getIngredientQty = (ingId: IngredientId): number => {
    if (ingId.startsWith('herb_') || ingId.startsWith('mineral_')) {
      return herbsInventory[ingId as HerbId] || 0;
    }
    return inventory[ingId as keyof Inventory] || 0;
  };

  const getIngredientInfo = (ingId: IngredientId) => {
    const herb = HERB_CONFIG.find(h => h.id === ingId);
    if (herb) return { name: herb.name, emoji: herb.emoji, iconImage: herb.iconImage, qty: herbsInventory[herb.id] || 0 };
    const item = ITEM_CONFIG.find(i => i.id === ingId);
    if (item) return { name: item.name, emoji: item.emoji, iconImage: item.iconImage, qty: inventory[item.id] || 0 };
    return { name: ingId, emoji: '📦', iconImage: undefined, qty: 0 };
  };

  const getMaxCraftCount = (recipe: CraftingRecipe): number => {
    let max = Math.floor(spiritStones / recipe.spiritStonesCost);
    for (const ing of recipe.ingredients) {
      const have = getIngredientQty(ing.id);
      const canMake = Math.floor(have / ing.amount);
      if (canMake < max) max = canMake;
    }
    return Math.max(1, max);
  };

  return (
    <>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 800,
          color: '#10b981',
          marginBottom: '10px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>🧪 LÒ LUYỆN ĐAN BÁT QUÁI TIÊN GIA</span>
        <span style={{ color: '#38bdf8', fontSize: '12px' }}>💎 Linh Thạch: {spiritStones}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
          maxHeight: '460px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}
      >
        {CRAFTING_RECIPES.map(recipe => {
          const canAffordStones = spiritStones >= recipe.spiritStonesCost;
          const canAffordItems = recipe.ingredients.every(ing => getIngredientQty(ing.id) >= ing.amount);
          const canCraft = canAffordStones && canAffordItems;

          return (
            <div
              key={recipe.id}
              style={{
                padding: '12px',
                borderRadius: '14px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${RARITY_COLORS[recipe.rarity]}55`,
                boxShadow: `0 0 15px ${RARITY_COLORS[recipe.rarity]}20`
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {recipe.iconImage ? (
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${RARITY_COLORS[recipe.rarity]}88`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 0 10px ${RARITY_COLORS[recipe.rarity]}44`
                      }}
                    >
                      <img
                        src={recipe.iconImage}
                        alt={recipe.name}
                        style={{ width: '36px', height: '36px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '24px' }}>{recipe.emoji}</span>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: RARITY_COLORS[recipe.rarity] }}>
                      {recipe.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Chế tạo {recipe.resultAmount}x {ITEM_CONFIG.find(i => i.id === recipe.resultItemId)?.name}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginBottom: '8px', lineHeight: '1.4' }}>
                  {recipe.description}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '6px 8px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#fde68a', marginBottom: '4px' }}>
                    Nguyên Liệu Dược Liệu/Quặng Cần:
                  </div>
                  {recipe.ingredients.map(ing => {
                    const info = getIngredientInfo(ing.id);
                    const hasEnough = info.qty >= ing.amount;
                    return (
                      <div
                        key={ing.id}
                        style={{
                          color: hasEnough ? '#86efac' : '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '3px'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {info.iconImage ? (
                            <img
                              src={info.iconImage}
                              alt={info.name}
                              style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                            />
                          ) : (
                            <span>{info.emoji}</span>
                          )}
                          <span>{info.name} x{ing.amount}</span>
                        </span>
                        <span>
                          ({info.qty}/{ing.amount})
                        </span>
                      </div>
                    );
                  })}
                  <div
                    style={{
                      color: canAffordStones ? '#38bdf8' : '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      paddingTop: '3px'
                    }}
                  >
                    <span>💎 Linh Thạch</span>
                    <span>{recipe.spiritStonesCost} 💎</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  disabled={!canCraft}
                  onClick={() => onCraftPill(recipe, 1)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '11px',
                    background: canCraft ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(100,116,139,0.2)',
                    border: `1px solid ${canCraft ? '#f87171' : 'transparent'}`,
                    color: canCraft ? '#fff' : '#64748b',
                    cursor: canCraft ? 'pointer' : 'not-allowed',
                    boxShadow: canCraft ? '0 0 12px rgba(239,68,68,0.4)' : 'none'
                  }}
                >
                  {canCraft ? '🔥 LUYỆN ĐAN (x1)' : 'Thiếu Nguyên Liệu / Linh Thạch'}
                </button>

                {canCraft && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => onCraftPill(recipe, 5)}
                      style={{
                        flex: 1,
                        padding: '5px',
                        borderRadius: '6px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        background: 'rgba(239,68,68,0.18)',
                        border: '1px solid #ef444466',
                        color: '#fca5a5',
                        cursor: 'pointer'
                      }}
                    >
                      🔥 x5
                    </button>
                    <button
                      onClick={() => onCraftPill(recipe, 10)}
                      style={{
                        flex: 1,
                        padding: '5px',
                        borderRadius: '6px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        background: 'rgba(239,68,68,0.18)',
                        border: '1px solid #ef444466',
                        color: '#fca5a5',
                        cursor: 'pointer'
                      }}
                    >
                      🔥 x10
                    </button>
                    {(() => {
                      const maxAfford = getMaxCraftCount(recipe);
                      return (
                        <button
                          onClick={() => onCraftPill(recipe, maxAfford)}
                          style={{
                            flex: 1.2,
                            padding: '5px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 900,
                            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                            border: '1px solid #fde68a',
                            color: '#000',
                            cursor: 'pointer'
                          }}
                        >
                          ⚡ MAX (x{maxAfford})
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
