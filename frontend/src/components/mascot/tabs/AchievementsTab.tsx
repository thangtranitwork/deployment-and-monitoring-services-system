import React from 'react';
import { Search, Gift, Check, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants';

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
  const filteredAchievements = ACHIEVEMENTS.filter(ach => {
    const matchesCat = categoryFilter === 'all' || ach.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      ach.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ach.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <>
      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '14px',
                height: '14px',
                color: '#64748b'
              }}
            />
            <input
              type="text"
              placeholder="🔍 Tìm kiếm trong 102 thành tựu..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15,23,42,0.85)',
                border: '1px solid rgba(245,158,11,0.28)',
                borderRadius: '10px',
                padding: '7px 12px 7px 32px',
                fontSize: '12px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 800, flexShrink: 0 }}>
            🏆 {unlockedAchievements.length}/102 Thành Tựu
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { key: 'all', label: 'Tất Cả (102)' },
            { key: 'cultivation', label: '🧘 Tu Tiên (28)' },
            { key: 'devops', label: '🚀 DevOps (26)' },
            { key: 'activity', label: '⏱️ Hoạt Động (28)' },
            { key: 'secret', label: '🔮 Bí Cảnh (20)' }
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => onCategoryFilterChange(cat.key)}
              style={{
                background:
                  categoryFilter === cat.key ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${
                  categoryFilter === cat.key ? '#f59e0b' : 'rgba(255,255,255,0.08)'
                }`,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                color: categoryFilter === cat.key ? '#fde68a' : '#94a3b8',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))',
          gap: '10px',
          maxHeight: '380px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px'
        }}
      >
        {filteredAchievements.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '32px 0' }}>
            Không tìm thấy thành tựu nào khớp với từ khóa "{searchQuery}"
          </div>
        ) : (
          filteredAchievements.map(ach => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            const isSecret = ach.isSecret && !isUnlocked;
            return (
              <div
                key={ach.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  background: isUnlocked
                    ? 'rgba(245,158,11,0.12)'
                    : isSecret
                    ? 'rgba(88,28,135,0.18)'
                    : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${
                    isUnlocked
                      ? 'rgba(245,158,11,0.5)'
                      : isSecret
                      ? 'rgba(168,85,247,0.3)'
                      : 'rgba(255,255,255,0.06)'
                  }`,
                  opacity: isUnlocked ? 1 : 0.7
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0, filter: isUnlocked ? 'none' : 'grayscale(80%)' }}>
                    {isSecret ? '❓' : ach.icon}
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '11.5px',
                          color: isUnlocked ? '#fbbf24' : isSecret ? '#c084fc' : '#e2e8f0'
                        }}
                      >
                        {isSecret ? 'Thành Tựu Ẩn' : ach.title}
                      </span>
                      {ach.isSecret && (
                        <span
                          style={{
                            background: 'rgba(168,85,247,0.2)',
                            border: '1px solid rgba(168,85,247,0.4)',
                            borderRadius: '4px',
                            padding: '0px 4px',
                            fontSize: '8px',
                            color: '#d8b4fe'
                          }}
                        >
                          ẨN
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: isUnlocked ? '#cbd5e1' : '#94a3b8',
                        marginTop: '2px',
                        lineHeight: '1.35'
                      }}
                    >
                      {isSecret ? (ach.hint ?? 'Bí ẩn đang chờ...') : ach.description}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '9.5px',
                        color: isUnlocked ? '#86efac' : '#fde047',
                        fontWeight: 600
                      }}
                    >
                      <Gift style={{ width: '10px', height: '10px' }} />
                      {ach.rewardText}
                    </div>
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: '4px', marginTop: '2px' }}>
                  {isUnlocked ? (
                    <div
                      style={{
                        width: '19px',
                        height: '19px',
                        background: '#f59e0b',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Check style={{ width: '11px', height: '11px', color: '#000', strokeWidth: 3 }} />
                    </div>
                  ) : (
                    <Lock style={{ width: '13px', height: '13px', color: '#64748b' }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
