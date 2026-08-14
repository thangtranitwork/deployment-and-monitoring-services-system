import React from 'react';
import { Package, X } from 'lucide-react';
import { LevelInfo } from '../types';

export const SpeechBubble: React.FC<{
  bubbleText: string;
  currentLevelInfo: LevelInfo;
  xp: number;
  prevReq: number;
  nextReq: number;
  progressPercent: number;
  isReadyToBreakthrough: boolean;
  isTribulationLevel: boolean;
  currentSuccessRatePercent: number;
  failCountAtCurrentLevel: number;
  isTalismanActive: boolean;
  isRealmPillActive?: boolean;
  isReviveActive?: boolean;
  isVoCucActive?: boolean;
  totalInventory: number;
  onOpenCostumePicker: () => void;
  onBreakthrough: (e: React.MouseEvent) => void;
  onToggleInventory: (e: React.MouseEvent) => void;
  onDismiss: (e: React.MouseEvent) => void;
}> = ({
  bubbleText,
  currentLevelInfo,
  xp,
  prevReq,
  nextReq,
  progressPercent,
  isReadyToBreakthrough,
  isTribulationLevel,
  currentSuccessRatePercent,
  failCountAtCurrentLevel,
  isTalismanActive,
  isRealmPillActive,
  isReviveActive,
  isVoCucActive,
  totalInventory,
  onOpenCostumePicker,
  onBreakthrough,
  onToggleInventory,
  onDismiss
}) => {
  return (
    <div
      className="mascot-bubble"
      style={{
        position: 'relative',
        marginBottom: '8px',
        padding: '6px 12px',
        borderRadius: '14px',
        background: 'rgba(10,13,22,0.96)',
        border: '1px solid rgba(245,158,11,0.45)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        maxWidth: 'min(480px, calc(100vw - 24px))',
        width: 'max-content'
      }}
    >
      {/* Cảnh Giới Badge */}
      <button
        onClick={e => {
          e.stopPropagation();
          onOpenCostumePicker();
        }}
        onPointerDown={e => e.stopPropagation()}
        title="Xem Cảnh Giới Tu Tiên, Thân Pháp, Pháp Bảo & Thú Cưỡi Gacha"
        style={{
          background: 'linear-gradient(135deg,rgba(245,158,11,0.28),rgba(168,85,247,0.28),rgba(16,185,129,0.28))',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: '8px',
          padding: '2px 8px',
          fontSize: '10.5px',
          fontWeight: 900,
          color: '#fde68a',
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxShadow: '0 0 10px rgba(245,158,11,0.2)'
        }}
      >
        {currentLevelInfo.name}
      </button>

      {/* Vòng Tròn % XP */}
      <div
        onClick={e => {
          e.stopPropagation();
          onOpenCostumePicker();
        }}
        onPointerDown={e => e.stopPropagation()}
        title={`Linh Lực Tu Vi: ${Math.floor(Math.max(0, xp - prevReq))} / ${nextReq - prevReq} XP (${Math.round(progressPercent)}%)`}
        style={{
          position: 'relative',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          borderRadius: '50%',
          background: 'rgba(10, 13, 22, 0.85)',
          border: `1px solid ${progressPercent >= 100 ? 'rgba(52,211,153,0.6)' : 'rgba(245,158,11,0.35)'}`,
          boxShadow: progressPercent >= 100 ? '0 0 10px rgba(52,211,153,0.5)' : '0 0 6px rgba(245,158,11,0.2)'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={progressPercent >= 100 ? '#34d399' : '#f59e0b'}
            strokeWidth="2.5"
            strokeDasharray={56.548}
            strokeDashoffset={56.548 * (1 - Math.min(100, Math.max(0, progressPercent)) / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
          />
        </svg>
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: Math.round(progressPercent) === 100 ? '6.5px' : '7.5px',
            fontWeight: 900,
            color: progressPercent >= 100 ? '#6ee7b7' : '#fde68a',
            lineHeight: 1
          }}
        >
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Bubble Text */}
      <span
        title={bubbleText}
        style={{
          color: '#fde68a',
          fontWeight: 500,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.35,
          maxHeight: '80px',
          overflowY: 'auto',
          flex: '1 1 auto',
          minWidth: '60px',
          paddingRight: '2px'
        }}
      >
        {bubbleText}
      </span>

      {/* Breakthrough or Inventory Button */}
      {isReadyToBreakthrough ? (
        <button
          onClick={onBreakthrough}
          onPointerDown={e => e.stopPropagation()}
          title={
            isTribulationLevel
              ? `ĐỘ KIẾP! Tỉ lệ thành công: ${currentSuccessRatePercent}% (${failCountAtCurrentLevel > 0 ? `+${failCountAtCurrentLevel * 5}% Pity` : 'Cơ bản'})`
              : 'ĐỘT PHÁ lên Trúc Cơ Kỳ!'
          }
          style={{
            background: isTribulationLevel
              ? isTalismanActive
                ? 'linear-gradient(135deg,#fde047,#f59e0b,#eab308)'
                : 'linear-gradient(135deg,#f59e0b,#ef4444,#eab308)'
              : 'linear-gradient(135deg,#34d399,#14b8a6,#fbbf24)',
            border: `1px solid ${isTribulationLevel ? (isTalismanActive ? '#fde047' : '#fde68a') : '#6ee7b7'}`,
            borderRadius: '8px',
            padding: isTalismanActive ? '2px 10px 3px' : '2px 10px',
            fontWeight: 900,
            fontSize: '10.5px',
            color: '#000',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxShadow:
              isTalismanActive && isTribulationLevel
                ? '0 0 22px rgba(253,224,71,0.9), 0 0 8px rgba(245,158,11,0.8)'
                : '0 0 14px rgba(245,158,11,0.7)',
            animation: 'pulse 1.5s infinite'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <span>{isTribulationLevel ? `🌩️ ĐỘ KIẾP (${currentSuccessRatePercent}%)` : '✨ ĐỘT PHÁ'}</span>
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {failCountAtCurrentLevel > 0 && (
                <span style={{ fontSize: '8.5px', color: '#7f1d1d', fontWeight: 900 }}>
                  +{failCountAtCurrentLevel * 5}% Tích Tụ
                </span>
              )}
              {isRealmPillActive && (
                <span style={{ fontSize: '8.5px', color: '#15803d', fontWeight: 900 }}>🌱 Đan Cảnh Giới</span>
              )}
              {isTalismanActive && (
                <span style={{ fontSize: '8.5px', color: '#854d0e', fontWeight: 900 }}>🔱 +25% Phù</span>
              )}
              {isReviveActive && (
                <span style={{ fontSize: '8.5px', color: '#6b21a8', fontWeight: 900 }}>🔮 +35% (Bảo Hộ)</span>
              )}
              {isVoCucActive && (
                <span style={{ fontSize: '8.5px', color: '#1e3a8a', fontWeight: 900 }}>☯️ +20% Vô Cực</span>
              )}
            </div>
          </div>
        </button>
      ) : null}

      {/* Bag Button */}
      <button
        onClick={onToggleInventory}
        onPointerDown={e => e.stopPropagation()}
        title="Mở Túi Trữ Vật (Dùng Đan Dược & Quản lý Dược Liệu)"
        style={{
          background: totalInventory > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
          border: `1px solid ${totalInventory > 0 ? 'rgba(245,158,11,0.5)' : 'rgba(100,116,139,0.3)'}`,
          borderRadius: '8px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: 800,
          color: totalInventory > 0 ? '#fde68a' : '#94a3b8',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <img
          src="/items/43_can_khon_tui.png"
          alt="Túi Trữ Vật"
          style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' }}
        />
        {totalInventory > 0 && <span>{totalInventory}</span>}
      </button>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        onPointerDown={e => e.stopPropagation()}
        title="Ẩn Thỏ"
        style={{
          color: '#64748b',
          cursor: 'pointer',
          padding: '2px',
          borderRadius: '50%',
          background: 'none',
          border: 'none',
          flexShrink: 0
        }}
      >
        <X style={{ width: '12px', height: '12px' }} />
      </button>
      <div
        style={{
          position: 'absolute',
          bottom: '-5px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '8px',
          height: '8px',
          background: 'rgba(10,13,22,0.96)',
          borderRight: '1px solid rgba(245,158,11,0.45)',
          borderBottom: '1px solid rgba(245,158,11,0.45)'
        }}
      />
    </div>
  );
};
