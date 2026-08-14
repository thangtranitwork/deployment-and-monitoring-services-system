import React, { useState } from 'react';
import { Search, Gift, Check, Lock, BookOpen } from 'lucide-react';
import { ACHIEVEMENTS, ITEM_CONFIG, HERB_CONFIG } from '../constants';

export const AchievementsTab: React.FC<{
  unlockedAchievements: string[];
  searchQuery: string;
  categoryFilter: string;
  onSearchChange: (q: string) => void;
  onCategoryFilterChange: (cat: string) => void;
}> = ({
  unlockedAchievements,
  searchQuery,
  categoryFilter,
  onSearchChange,
  onCategoryFilterChange
}) => {
  const [hoveredAch, setHoveredAch] = useState<any | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const filteredAchievements = ACHIEVEMENTS.filter(ach => {
    const matchesCat = categoryFilter === 'all' || ach.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      ach.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ach.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const [selectedAchId, setSelectedAchId] = useState<string>(filteredAchievements[0]?.id || ACHIEVEMENTS[0].id);

  const selectedAch = ACHIEVEMENTS.find(a => a.id === selectedAchId) || filteredAchievements[0] || ACHIEVEMENTS[0];
  const isSelectedUnlocked = unlockedAchievements.includes(selectedAch.id);
  const isSelectedSecret = selectedAch.isSecret && !isSelectedUnlocked;

  const rewardItemConfig = selectedAch.reward.itemId
    ? ITEM_CONFIG.find(i => i.id === selectedAch.reward.itemId) || HERB_CONFIG.find(h => (h.id as string) === selectedAch.reward.itemId)
    : null;

  const handleMouseEnter = (ach: any, e: React.MouseEvent) => {
    setHoveredAch(ach);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: rect.right + 10, y: rect.top });
  };

  const handleMouseLeave = () => {
    setHoveredAch(null);
  };

  return (
    <div style={{ display: 'flex', gap: '14px', height: '460px', position: 'relative' }}>
      {/* ─── HOVER OVERLAY TOOLTIP ────────────────────────────────────────── */}
      {hoveredAch && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(hoverPos.x, window.innerWidth - 300)}px`,
            top: `${Math.min(hoverPos.y, window.innerHeight - 200)}px`,
            width: '270px',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
            border: `1.5px solid ${unlockedAchievements.includes(hoveredAch.id) ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: '12px',
            padding: '12px 14px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.6), 0 0 15px rgba(245,158,11,0.2)',
            zIndex: 9999,
            pointerEvents: 'none',
            backdropFilter: 'blur(12px)',
            transition: 'opacity 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '26px' }}>
              {hoveredAch.isSecret && !unlockedAchievements.includes(hoveredAch.id) ? '❓' : hoveredAch.icon}
            </span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '13px', color: unlockedAchievements.includes(hoveredAch.id) ? '#fde047' : '#f1f5f9' }}>
                {hoveredAch.isSecret && !unlockedAchievements.includes(hoveredAch.id) ? 'Thành Tựu Ẩn' : hoveredAch.title}
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: unlockedAchievements.includes(hoveredAch.id) ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)',
                  color: unlockedAchievements.includes(hoveredAch.id) ? '#86efac' : '#94a3b8',
                  textTransform: 'uppercase'
                }}
              >
                {unlockedAchievements.includes(hoveredAch.id) ? '✓ Đã hoàn thành' : '🔒 Chưa mở khóa'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '10px' }}>
            {hoveredAch.isSecret && !unlockedAchievements.includes(hoveredAch.id)
              ? `💡 Gợi ý: ${hoveredAch.hint || 'Khám phá bí mật trong tam giới...'}`
              : hoveredAch.description}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 800 }}>Phần Thưởng:</span>
            <span style={{ fontSize: '11px', color: '#fde047', fontWeight: 900 }}>🎁 {hoveredAch.rewardText}</span>
          </div>
        </div>
      )}
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
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
          <Search
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '14px',
              height: '14px',
              color: '#64748b'
            }}
          />
          <input
            type="text"
            placeholder="🔍 Tìm trong 102 thành tựu..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(245,158,11,0.28)',
              borderRadius: '8px',
              padding: '7px 10px 7px 30px',
              fontSize: '11.5px',
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
            { key: 'cultivation', label: '🧘 Tu Tiên' },
            { key: 'devops', label: '🚀 DevOps' },
            { key: 'activity', label: '⏱️ Hoạt Động' },
            { key: 'secret', label: '🔮 Bí Cảnh' }
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => onCategoryFilterChange(cat.key)}
              style={{
                background: categoryFilter === cat.key ? 'rgba(245,158,11,0.25)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${categoryFilter === cat.key ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                color: categoryFilter === cat.key ? '#fde68a' : '#94a3b8',
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

        <div style={{ fontSize: '10.5px', color: '#86efac', fontWeight: 900, marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
          <span>🏆 Tiến Độ Mở Khóa:</span>
          <span>{unlockedAchievements.length}/102</span>
        </div>

        {filteredAchievements.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '24px 0' }}>
            Không tìm thấy thành tựu nào.
          </div>
        ) : (
          filteredAchievements.map(ach => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            const isSecret = ach.isSecret && !isUnlocked;
            const isSelected = selectedAchId === ach.id;

            return (
              <button
                key={ach.id}
                onClick={() => setSelectedAchId(ach.id)}
                onMouseEnter={e => handleMouseEnter(ach, e)}
                onMouseLeave={handleMouseLeave}
                style={{
                  padding: '9px 11px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(168,85,247,0.25))'
                    : isUnlocked
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${
                    isSelected
                      ? '#f59e0b'
                      : isUnlocked
                      ? 'rgba(245,158,11,0.3)'
                      : 'rgba(255,255,255,0.06)'
                  }`,
                  color: isSelected ? '#fde68a' : isUnlocked ? '#f1f5f9' : '#64748b',
                  cursor: 'pointer',
                  opacity: isUnlocked ? 1 : 0.65,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>
                    {isSecret ? '❓' : ach.icon}
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '12px',
                        color: isSelected ? '#fde047' : isUnlocked ? '#fbbf24' : isSecret ? '#c084fc' : '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {isSecret ? 'Thành Tựu Ẩn' : ach.title}
                    </div>
                    <div style={{ fontSize: '10px', color: isUnlocked ? '#86efac' : '#94a3b8' }}>
                      {isUnlocked ? 'Đã hoàn thành' : 'Chưa mở'}
                    </div>
                  </div>
                </div>

                {isUnlocked ? (
                  <div style={{ width: '18px', height: '18px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check style={{ width: '11px', height: '11px', color: '#000', strokeWidth: 3 }} />
                  </div>
                ) : (
                  <Lock style={{ width: '13px', height: '13px', color: '#475569', flexShrink: 0 }} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ─── RIGHT COLUMN: Detail & Action Panel ─────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: 'rgba(15,23,42,0.6)',
          border: `1px solid ${isSelectedUnlocked ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: isSelectedUnlocked ? '0 0 25px rgba(245,158,11,0.2)' : 'none',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Avatar Icon */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '22px',
              background: isSelectedUnlocked
                ? 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(0,0,0,0.6) 80%)'
                : 'radial-gradient(circle, rgba(88,28,135,0.3) 0%, rgba(0,0,0,0.6) 80%)',
              border: `2px solid ${isSelectedUnlocked ? '#f59e0b' : 'rgba(168,85,247,0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '46px',
              marginBottom: '14px',
              boxShadow: isSelectedUnlocked ? '0 0 24px rgba(245,158,11,0.4)' : 'none'
            }}
          >
            {isSelectedSecret ? '❓' : selectedAch.icon}
          </div>

          {/* Title & Badges */}
          <div style={{ fontWeight: 900, fontSize: '18px', color: isSelectedUnlocked ? '#fbbf24' : isSelectedSecret ? '#c084fc' : '#fff', marginBottom: '6px' }}>
            {isSelectedSecret ? 'Thành Tựu Bí Cảnh Ẩn' : selectedAch.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '5px' }}>
              Danh Mục: {selectedAch.category.toUpperCase()}
            </span>
            {selectedAch.isSecret && (
              <span style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '5px' }}>
                🔮 THÀNH TỰU ẨN
              </span>
            )}
          </div>

          {/* Status Banner */}
          <div
            style={{
              background: isSelectedUnlocked ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${isSelectedUnlocked ? '#10b98166' : '#ef444466'}`,
              color: isSelectedUnlocked ? '#86efac' : '#fca5a5',
              borderRadius: '999px',
              padding: '5px 16px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '16px'
            }}
          >
            {isSelectedUnlocked ? (
              <>
                <Check style={{ width: '14px', height: '14px' }} /> 🏆 ĐÃ HOÀN THÀNH & NHẬN THƯỞNG
              </>
            ) : (
              <>
                <Lock style={{ width: '14px', height: '14px' }} /> CHƯA MỞ KHÓA THÀNH TỰU NÀY
              </>
            )}
          </div>

          {/* Lore & Unlock Guide Data Box */}
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '12.5px',
              color: '#cbd5e1',
              lineHeight: '1.6',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '16px',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#fbbf24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen style={{ width: '13px', height: '13px' }} /> ĐIỂN TÍCH & HƯỚNG DẪN THÀNH TỰU:
            </div>
            {isSelectedSecret ? (selectedAch.hint ?? 'Hãy tích cực khám phá bí mật trong thế giới Tiên Gia để giải mã và mở khóa thành tựu ẩn này...') : selectedAch.description}
          </div>

          {/* Reward Box */}
          <div
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: '12px',
              padding: '12px 16px',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <Gift style={{ width: '18px', height: '18px', color: '#fde047', flexShrink: 0 }} />
            {rewardItemConfig?.iconImage && (
              <img src={rewardItemConfig.iconImage} alt={rewardItemConfig.name} style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#fde68a' }}>
              Phần Thưởng: {selectedAch.rewardText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
