import React, { useState } from 'react';
import { CraftingRecipe, HerbId, IngredientId, Inventory, ItemCategory } from '../types';
import { CRAFTING_RECIPES, RARITY_COLORS, ITEM_CONFIG, HERB_CONFIG } from '../constants';
import { Check, X, Flame, BookOpen } from 'lucide-react';

export const CraftingTab: React.FC<{
  spiritStones: number;
  inventory: Inventory;
  herbsInventory: Record<HerbId, number>;
  onCraftPill: (recipe: CraftingRecipe, count: number) => void;
}> = ({ spiritStones, inventory, herbsInventory, onCraftPill }) => {
  const [filterCategory, setFilterCategory] = useState<'all' | ItemCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(CRAFTING_RECIPES[0].id);
  const [craftBatchCount, setCraftBatchCount] = useState<number>(1);

  const filteredRecipes = CRAFTING_RECIPES.filter(r => {
    const matchesCat = filterCategory === 'all' || r.category === filterCategory;
    const matchesSearch = !searchQuery.trim() || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });
  const selectedRecipe = CRAFTING_RECIPES.find(r => r.id === selectedRecipeId) || filteredRecipes[0] || CRAFTING_RECIPES[0];

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

  const maxCraftPossible = getMaxCraftCount(selectedRecipe);
  const canAffordStones = spiritStones >= selectedRecipe.spiritStonesCost * craftBatchCount;
  const canAffordItems = selectedRecipe.ingredients.every(ing => getIngredientQty(ing.id) >= ing.amount * craftBatchCount);
  const canCraft = canAffordStones && canAffordItems;

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
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#10b981', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            🧪 CÔNG THỨC LUYỆN ĐAN
          </span>
          <span style={{ fontSize: '10.5px', color: '#38bdf8', fontWeight: 900 }}>💎 {spiritStones}</span>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {[
            { key: 'all', label: 'Tất Cả' },
            { key: 'xp', label: '💊 Tu Vi' },
            { key: 'breakthrough', label: '⚡ Đột Phá' },
            { key: 'buff', label: '🌟 Buff' },
            { key: 'forge', label: '📜 Rèn' }
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key as any)}
              style={{
                background: filterCategory === cat.key ? 'rgba(16,185,129,0.25)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${filterCategory === cat.key ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                color: filterCategory === cat.key ? '#86efac' : '#94a3b8',
                borderRadius: '6px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredRecipes.map(recipe => {
          const isSelected = selectedRecipeId === recipe.id;
          const readyToCraft = spiritStones >= recipe.spiritStonesCost && recipe.ingredients.every(ing => getIngredientQty(ing.id) >= ing.amount);

          return (
            <button
              key={recipe.id}
              onClick={() => {
                setSelectedRecipeId(recipe.id);
                setCraftBatchCount(1);
              }}
              style={{
                padding: '9px 11px',
                borderRadius: '10px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(245,158,11,0.25))'
                  : readyToCraft
                  ? 'rgba(16,185,129,0.08)'
                  : 'rgba(0,0,0,0.25)',
                border: `1px solid ${
                  isSelected
                    ? '#10b981'
                    : readyToCraft
                    ? 'rgba(16,185,129,0.3)'
                    : 'rgba(255,255,255,0.06)'
                }`,
                color: isSelected ? '#86efac' : readyToCraft ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${RARITY_COLORS[recipe.rarity]}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {recipe.iconImage ? (
                    <img src={recipe.iconImage} alt={recipe.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{recipe.emoji}</span>
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: isSelected ? '#86efac' : RARITY_COLORS[recipe.rarity],
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {recipe.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    💎 {recipe.spiritStonesCost} Linh Thạch
                  </div>
                </div>
              </div>

              {readyToCraft && (
                <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#86efac', borderRadius: '5px', padding: '2px 6px', fontSize: '9px', fontWeight: 900 }}>
                  Đủ Dược
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── RIGHT COLUMN: Detail & Action Panel ─────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: 'rgba(15,23,42,0.6)',
          border: `1px solid ${RARITY_COLORS[selectedRecipe.rarity]}44`,
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: `0 0 25px ${RARITY_COLORS[selectedRecipe.rarity]}15`,
          overflowY: 'auto'
        }}
      >
        <div>
          {/* Recipe Header Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(0,0,0,0.6) 80%)',
                border: `1.5px solid ${RARITY_COLORS[selectedRecipe.rarity]}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {selectedRecipe.iconImage ? (
                <img src={selectedRecipe.iconImage} alt={selectedRecipe.name} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '40px' }}>{selectedRecipe.emoji}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 900, fontSize: '17px', color: RARITY_COLORS[selectedRecipe.rarity] }}>
                  {selectedRecipe.name}
                </span>
                <span style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid #10b98166', color: '#86efac', fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px' }}>
                  Tỉ lệ: {Math.round(selectedRecipe.successRate * 100)}%
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.5' }}>
                {selectedRecipe.description}
              </div>
            </div>
          </div>

          {/* Recipe Lore Data Box */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#10b981', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen style={{ width: '13px', height: '13px' }} /> DƯỢC LÝ & ĐAN PHƯƠNG BÁT QUÁI:
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
              Luyện chế đan dược tại Thái Cổ Bát Quái Lò đòi hỏi sự hòa hợp giữa dược liệu linh thảo và linh thạch trấn định. Khi luyện thành công, linh đan sẽ mang lại năng lượng tu vi đột phá mạnh mẽ.
            </div>
          </div>

          {/* Required Ingredients Checklist */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#fde68a', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>🧪 NGUYÊN LIỆU YÊU CẦU:</span>
              <span style={{ color: canAffordStones ? '#38bdf8' : '#ef4444' }}>
                💎 {(selectedRecipe.spiritStonesCost * craftBatchCount).toLocaleString()} Linh Thạch
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedRecipe.ingredients.map(ing => {
                const info = getIngredientInfo(ing.id);
                const reqTotal = ing.amount * craftBatchCount;
                const hasEnough = info.qty >= reqTotal;

                return (
                  <div
                    key={ing.id}
                    style={{
                      background: hasEnough ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      border: `1px solid ${hasEnough ? '#10b98155' : '#ef444455'}`,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {info.iconImage ? (
                        <img src={info.iconImage} alt={info.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '16px' }}>{info.emoji}</span>
                      )}
                      <span style={{ fontWeight: 800, color: '#e2e8f0' }}>{info.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 900, color: hasEnough ? '#86efac' : '#fca5a5' }}>
                        {info.qty} / {reqTotal}
                      </span>
                      {hasEnough ? (
                        <Check style={{ width: '14px', height: '14px', color: '#10b981' }} />
                      ) : (
                        <X style={{ width: '14px', height: '14px', color: '#ef4444' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 800 }}>Số lượng luyện:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 5, 10].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setCraftBatchCount(cnt)}
                  style={{
                    background: craftBatchCount === cnt ? '#10b98133' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${craftBatchCount === cnt ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                    color: craftBatchCount === cnt ? '#86efac' : '#94a3b8',
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
                onClick={() => setCraftBatchCount(maxCraftPossible)}
                style={{
                  background: 'rgba(245,158,11,0.2)',
                  border: '1px solid #f59e0b',
                  color: '#fde68a',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Max ({maxCraftPossible}x)
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => {
            if (canCraft) {
              onCraftPill(selectedRecipe, craftBatchCount);
            }
          }}
          disabled={!canCraft}
          style={{
            width: '100%',
            background: canCraft
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'rgba(50,50,50,0.4)',
            border: `1.5px solid ${canCraft ? '#86efac' : 'transparent'}`,
            borderRadius: '12px',
            padding: '13px',
            color: canCraft ? '#fff' : '#64748b',
            fontWeight: 900,
            fontSize: '13.5px',
            cursor: canCraft ? 'pointer' : 'not-allowed',
            boxShadow: canCraft ? '0 0 20px rgba(16,185,129,0.4)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Flame style={{ width: '18px', height: '18px' }} />
          {canCraft
            ? `🧪 LUYỆN ${craftBatchCount}X ${selectedRecipe.name.toUpperCase()} (LÒ BÁT QUÁI)`
            : '🔒 THIẾU NGUYÊN LIỆU HOẶC LINH THẠCH'}
        </button>
      </div>
    </div>
  );
};
