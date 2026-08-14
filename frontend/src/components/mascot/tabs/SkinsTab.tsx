import React, { useState } from 'react';
import { Lock, ShieldCheck, Sparkles, BookOpen, Zap, Award } from 'lucide-react';
import { LEVEL_CONFIG } from '../constants';
import { BunnySkinSprite } from '../components/BunnySkinSprite';

const REALM_DETAILS_LORE: Record<number, {
  title: string;
  stageName: string;
  realmType: string;
  breakthroughRate: string;
  elementAura: string;
  lore: string;
  powerPerks: string;
}> = {
  1: {
    title: 'Cảnh Giới 1: Luyện Khí Kỳ',
    stageName: 'Sơ Nhập Tu Tiên - Dẫn Khí Nhập Thể',
    realmType: 'Phàm Nhân Hóa Khí',
    breakthroughRate: '100% (Khởi đầu)',
    elementAura: 'Mộc Linh Thanh Thanh 🌿',
    lore: 'Luyện Khí là nấc thang đầu tiên trên con đường tu tiên phàm nhân. Tu sĩ thông qua thiền định, hấp thụ linh khí thiên địa qua 365 huyệt đạo, ngưng tụ chân khí sơ cấp trong đan điền.',
    powerPerks: 'Khai mở linh khí đan điền, cho phép hấp thụ đan dược sơ cấp & ngự kiếm phi hành.'
  },
  2: {
    title: 'Cảnh Giới 2: Trúc Cơ Kỳ',
    stageName: 'Đúc Cơ Khí Hải - Đan Điền Thành Hình',
    realmType: 'Hậu Thiên Nhập Tiên',
    breakthroughRate: '95% (Cần Trúc Cơ Đan hỗ trợ)',
    elementAura: 'Lam Quang Linh Phù 📜',
    lore: 'Trúc Cơ là quá trình cô đọng chân khí thành dịch thể, mở rộng khí hải đan điền gấp mười lần. Bước sang Trúc Cơ Kỳ, thọ nguyên tu sĩ tăng lên 200 năm, bách bệnh bất xâm.',
    powerPerks: 'Mở khóa chức năng Bổ Trợ Rèn Pháp Bảo & nhận buff +10% Linh Lực mỗi khi kéo Thỏ.'
  },
  3: {
    title: 'Cảnh Giới 3: Kim Đan Kỳ',
    stageName: 'Kết Thành Kim Đan - Bất Hủ Căn Cơ',
    realmType: 'Thái Cổ Kim Đan',
    breakthroughRate: '85% (Cần Kim Đan hỗ trợ)',
    elementAura: 'Hoàng Kim Hào Quang 🟡',
    lore: 'Nhiều tu sĩ cả đời dừng lại ở Trúc Cơ. Khi vạn giọt chân dịch ngưng tụ thành một viên Kim Đan tròn trịa phát sáng trong đan điền, tu sĩ chính thức bước vào hàng cao thủ tiên gia, thọ 500 tuổi.',
    powerPerks: 'Luyện chế đan dược trung cấp tại Bát Quái Lò & mở khóa skin Kim Đan Phi Kiếm.'
  },
  4: {
    title: 'Cảnh Giới 4: Nguyên Anh Kỳ',
    stageName: 'Phá Xác Thành Anh - Thần Thức Xuất Hồn',
    realmType: 'Chân Thân Nguyên Anh',
    breakthroughRate: '75% (Cần Nguyên Anh Đan)',
    elementAura: 'Thái Cổ Tử Quang 👶',
    lore: 'Kim Đan nứt vỡ, sinh ra một Linh Anh bé nhỏ mang hình hài tu sĩ. Dù thịt nát xương tan, Nguyên Anh vẫn có thể bay thoát ra ngoài đoạt xá tái sinh. Thọ nguyên chạm mốc 1.000 năm.',
    powerPerks: 'Tăng +25% tốc độ thu hoạch Linh Thạch & mở khóa ngự các Pháp Bảo hiếm.'
  },
  5: {
    title: 'Cảnh Giới 5: Hóa Thần Kỳ',
    stageName: 'Hóa Thần Thần Thông - Thông Thiên Triệt Địa',
    realmType: 'Thần Thức Tam Giới',
    breakthroughRate: '70% (Cần Hóa Thần Đan)',
    elementAura: 'Huyền Tử Linh Trượng ✨',
    lore: 'Nguyên Anh hòa làm một với thần thức, biến thành Thần Thể. Tu sĩ Hóa Thần có thể phân thân vạn dặm, thao túng linh khí đất trời trong bán kính hàng trăm dặm, thọ 2.000 năm.',
    powerPerks: 'Gia tăng +50% tỉ lệ rơi thảo dược hiếm từ Linh Tuyền & mở khóa Gacha Linh Thú.'
  },
  6: {
    title: 'Cảnh Giới 6: Luyện Hư Kỳ',
    stageName: 'Dung Nhập Hư Không - Chân Lý Đạo Cảnh',
    realmType: 'Hư Không Tam Giới',
    breakthroughRate: '65% (Cần Luyện Hư Đan)',
    elementAura: 'Hư Không Lam Luân 🌌',
    lore: 'Thân thể và thần thức bắt đầu dung hợp vào quy luật hư không thiên đạo. Tu sĩ Luyện Hư ẩn hiện tùy ý, có thể di chuyển xuyên qua không gian vạn dặm chỉ trong một nhịp thở.',
    powerPerks: 'Tăng +20% thành công khi rèn Pháp Bảo Hộ Thể & mở rộng kho chứa đồ.'
  },
  7: {
    title: 'Cảnh Giới 7: Hợp Thể Kỳ',
    stageName: 'Thân Tâm Hợp Nhất - Thất Tinh Đạo Phù',
    realmType: 'Hợp Thể Đạo Tổ',
    breakthroughRate: '60% (Cần Thiên Đạo Đan)',
    elementAura: 'Thiên Đạo Xích Thương ⚔️',
    lore: 'Phân thân và bản thể hợp làm một vĩnh viễn, đan điền chuyển hóa thành tinh không vũ trụ thu nhỏ. Sức mạnh pháp tắc đạt tới đỉnh phong phàm giới, thọ nguyên lên đến 5.000 năm.',
    powerPerks: 'Mở khóa đặc quyền Multi-Deploy 5 microservices cùng lúc nhận nhân đôi Linh Lực.'
  },
  8: {
    title: 'Cảnh Giới 8: Đại Thừa Kỳ',
    stageName: 'Đại Thừa Viên Viên - Chuẩn Bị Phi Thăng',
    realmType: 'Phàm Giới Đỉnh Phong',
    breakthroughRate: '55% (Cần Bát Quái Kính)',
    elementAura: 'Bát Quái Quang Minh 👑',
    lore: 'Giai đoạn viên mãn nhất của nhân giới. Linh lực trong cơ thể chuyển hóa dần thành Tiên Nguyên Khí. Tu sĩ chuẩn bị đón nhận thử thách tàn khốc nhất: Cửu Trọng Thiên Lôi Kiếp.',
    powerPerks: 'Miễn phí 1 lần Độ Kiếp bảo hộ không rớt XP & tăng +30% Linh Thạch khi bán đồ.'
  },
  9: {
    title: 'Cảnh Giới 9: Độ Kiếp Kỳ',
    stageName: 'Cửu Thiên Lôi Kiếp - Sinh Tử Vượt Kiếp',
    realmType: 'Thiên Lôi Thối Thể',
    breakthroughRate: '50% (Cần Độ Kiếp Đan & Hộ Phù)',
    elementAura: 'Tử Điện Lôi Ấn ⚡',
    lore: 'Trời đất giáng xuống 81 luồng lôi kiếp hủy thiên diệt địa. Thành công thì rũ bỏ xác phàm bước vào Tiên Giới; thất bại thì tán tiên hồn bay phách tán.',
    powerPerks: 'Mở khóa vũ khí Cửu Thiên Lôi Ấn & nhận buff +35% Drag XP vĩnh viễn.'
  },
  10: {
    title: 'Cảnh Giới 10: Chân Tiên Cảnh',
    stageName: 'Phi Thăng Tiên Giới - Bất Hủ Chân Thân',
    realmType: 'Chân Tiên Hạ Vị',
    breakthroughRate: '45% (Cần Chân Tiên Đan)',
    elementAura: 'Bồ Đề Kim Thần 🌟',
    lore: 'Rũ bỏ phàm thai, ngưng tụ Tiên Thể bất tử bất diệt. Tu sĩ chính thức gia nhập thiên đình, danh ghi trên Phong Thần Bảng, thọ ngang trời đất.',
    powerPerks: 'Sở hữu Bồ Đề Thần Thụ hộ thể & mở khóa tự động nhặt Dược Liệu Thái Cổ.'
  },
  11: {
    title: 'Cảnh Giới 11: Huyền Tiên Cảnh',
    stageName: 'Huyền Thần Thông Thiên - Đạo Luân Xoay Chuyển',
    realmType: 'Huyền Tiên Trung Vị',
    breakthroughRate: '40% (Cần Thái Cổ Kim Tinh)',
    elementAura: 'Huyền Thiên Đạo Luân 💫',
    lore: 'Lĩnh hội quy luật Huyền Chi Hữu Huyền của Tiên Giới. Mỗi chiêu thức thi triển ra đều mang uy áp thiên đạo chấn động tam thiên đại thiên thế giới.',
    powerPerks: 'Gia tăng +50% tỉ lệ thành công khi chế tạo Đan Dược Cực Phẩm.'
  },
  12: {
    title: 'Cảnh Giới 12: Kim Tiên Cảnh',
    stageName: 'Vạn Thọ Vô Cương - Kim Thân Bất Hoại',
    realmType: 'Kim Tiên Thượng Vị',
    breakthroughRate: '35% (Cần Vô Cực Đan)',
    elementAura: 'Kim Tiên Đế Ấn 🏆',
    lore: 'Tu thành Thái Ất Bất Hoại Kim Thân, nước lửa không xâm, bách kiếp không diệt. Xứng danh Trấn Đạo Tiên Quân nắm giữ vạn khoảnh tiên vực.',
    powerPerks: 'Cho phép cưỡi Bạch Ngọc Kỳ Lân với tốc độ kéo thả tối đa & +100% Linh Lực.'
  },
  13: {
    title: 'Cảnh Giới 13: Thái Ất Ngọc Tiên',
    stageName: 'Thái Ất Tụ Khí - Thanh Quang Diệu Thế',
    realmType: 'Thái Ất Tiên Vương',
    breakthroughRate: '30% (Cần Thái Ất Ngọc Hồ)',
    elementAura: 'Thái Ất Ngọc Hồ 🏺',
    lore: 'Lĩnh hội quy luật Thái Ất nguyên sơ, linh lực đan điền biến hóa thành vạn trượng tiên tuyền tinh khiết.',
    powerPerks: 'Nhận buff vĩnh viễn +20% Rèn Pháp Bảo & gia tăng 200 Linh Thạch mỗi lần kéo Thỏ.'
  },
  14: {
    title: 'Cảnh Giới 14: Thái Ất Kim Tiên',
    stageName: 'Thái Ất Thần Uy - Chấn Yểm Vạn Giới',
    realmType: 'Thái Ất Tiên Tôn',
    breakthroughRate: '25% (Cần Thái Ất Kim Đan)',
    elementAura: 'Thái Ất Thần Kích 🔱',
    lore: 'Đỉnh cao của cấp bậc Thái Ất. Một ánh mắt có thể thiêu rụi vô số tinh cầu, tay không xé rách màng giới tuyến giữa các vũ trụ.',
    powerPerks: 'Mở khóa Thái Ất Thần Kích hộ thể & tự động nhân 3 tốc độ luyện đan.'
  },
  15: {
    title: 'Cảnh Giới 15: Đại La Kim Tiên',
    stageName: 'Đại La Chí Tôn - Vô Lượng Thần Thông',
    realmType: 'Đại La Tiên Đế',
    breakthroughRate: '20% (Cần Hỗn Nguyên Thần Căn)',
    elementAura: 'Vạn Giới Thiên Luân 🌌',
    lore: 'Nhảy ra khỏi Ngũ Hành, không nằm trong Lục Đạo. Quá khứ, hiện tại và tương lai đều thu gọn vào một niệm của Đại La Kim Tiên.',
    powerPerks: 'Bảo vệ vĩnh viễn 100% không tổn thất Linh Lực hay Nguyên Liệu khi Độ Kiếp.'
  },
  16: {
    title: 'Cảnh Giới 16: Hỗn Nguyên Đại La',
    stageName: 'Hỗn Nguyên Đạo Tổ - Khai Thiên Lập Địa',
    realmType: 'Hỗn Nguyên Thánh Nhân',
    breakthroughRate: '15% (Cần Cửu Chuyển Đan)',
    elementAura: 'Hỗn Nguyên Đạo Đỉnh ☯️',
    lore: 'Đạt tới cảnh giới Đạo Tổ thuở ban sơ. Thân thể là đan điền vũ trụ, hơi thở là phong lôi, ánh mắt là nhật nguyệt thái không.',
    powerPerks: 'Sở hữu Hỗn Nguyên Đạo Đỉnh tự động tạo 500 Linh Thạch mỗi 10 phút.'
  },
  17: {
    title: 'Cảnh Giới 17: Thánh Nhân (Tiên Đế)',
    stageName: 'Vô Thượng Tiên Đế - Đỉnh Phong Vũ Trụ',
    realmType: 'Thái Cổ Chí Tôn Tiên Đế',
    breakthroughRate: '100% (Tối Cao Viên Viên)',
    elementAura: 'Vạn Giới Đạo Bảo 👑',
    lore: 'Đỉnh cao tối thượng của toàn bộ vạn giới tiên ma. Tiên Đế đứng trên cả thời gian và không gian, ý niệm sinh ra vũ trụ, hơi thở diệt vong vạn thiên thế giới.',
    powerPerks: 'Đạt đỉnh phong cảnh giới vĩnh viễn! Tất cả kỹ năng, Linh Thú & Pháp Bảo đều kích hoạt 100% công suất tối đa.'
  }
};

export const SkinsTab: React.FC<{
  xp: number;
  activeSkin: string;
  onSelectSkin: (skinId: string, skinName: string) => void;
}> = ({ xp, activeSkin, onSelectSkin }) => {
  const [selectedSkinId, setSelectedSkinId] = useState<string>(activeSkin || LEVEL_CONFIG[0].skinId);

  const selectedLvl = LEVEL_CONFIG.find(l => l.skinId === selectedSkinId) || LEVEL_CONFIG[0];
  const isSelectedUnlocked = xp >= selectedLvl.reqXp;
  const isSelectedEquipped = activeSkin === selectedLvl.skinId;

  const realmLore = REALM_DETAILS_LORE[selectedLvl.level] || REALM_DETAILS_LORE[1];

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
        <div
          style={{
            fontSize: '11px',
            fontWeight: 900,
            color: '#fbbf24',
            marginBottom: '4px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}
        >
          🥋 DANH SÁCH 17 CẢNH GIỚI ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/17)
        </div>

        {LEVEL_CONFIG.map(lvl => {
          const unlocked = xp >= lvl.reqXp;
          const equipped = activeSkin === lvl.skinId;
          const isSelected = selectedSkinId === lvl.skinId;

          return (
            <button
              key={lvl.skinId}
              onClick={() => setSelectedSkinId(lvl.skinId)}
              style={{
                padding: '9px 11px',
                borderRadius: '10px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(168,85,247,0.25))'
                  : equipped
                  ? 'rgba(245,158,11,0.12)'
                  : unlocked
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.25)',
                border: `1px solid ${
                  isSelected
                    ? '#f59e0b'
                    : equipped
                    ? 'rgba(245,158,11,0.4)'
                    : unlocked
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent'
                }`,
                color: isSelected ? '#fde68a' : unlocked ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                opacity: unlocked ? 1 : 0.6,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <BunnySkinSprite level={lvl.level} size={40} />
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: isSelected ? '#fde047' : unlocked ? '#f1f5f9' : '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    Lv.{lvl.level}: {lvl.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: unlocked ? '#86efac' : '#64748b' }}>
                    {unlocked ? 'Đã mở cảnh giới' : `${lvl.reqXp.toLocaleString()} XP`}
                  </div>
                </div>
              </div>

              {equipped ? (
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#000',
                    padding: '3px 7px',
                    borderRadius: '5px',
                    fontSize: '9.5px',
                    fontWeight: 900
                  }}
                >
                  Mặc
                </span>
              ) : !unlocked ? (
                <Lock style={{ width: '13px', height: '13px', color: '#475569', flexShrink: 0 }} />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ─── RIGHT COLUMN: Rich Detail & Action Panel ───────────────────────── */}
      <div
        style={{
          flex: 1,
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          overflowY: 'auto'
        }}
      >
        <div>
          {/* Header Avatar Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                position: 'relative',
                width: '90px',
                height: '90px',
                borderRadius: '18px',
                background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(0,0,0,0.6) 80%)',
                border: '2px solid rgba(245,158,11,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 25px rgba(245,158,11,0.3)'
              }}
            >
              <BunnySkinSprite level={selectedLvl.level} size={84} />
              {isSelectedEquipped && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#f59e0b',
                    color: '#000',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.8)'
                  }}
                >
                  ĐANG MẶC
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontWeight: 900, fontSize: '18px', color: '#fbbf24', marginBottom: '3px' }}>
                Lv.{selectedLvl.level}: {selectedLvl.name}
              </div>
              <div style={{ fontSize: '12px', color: '#fde68a', fontWeight: 800, marginBottom: '6px' }}>
                {realmLore.stageName}
              </div>
              <div>
                {isSelectedUnlocked ? (
                  <span
                    style={{
                      background: 'rgba(16,185,129,0.18)',
                      border: '1px solid #10b98166',
                      color: '#86efac',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ShieldCheck style={{ width: '13px', height: '13px' }} /> ĐÃ MỞ KHÓA CẢNH GIỚI
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(239,68,68,0.18)',
                      border: '1px solid #ef444466',
                      color: '#fca5a5',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Lock style={{ width: '13px', height: '13px' }} /> YÊU CẦU: {selectedLvl.reqXp.toLocaleString()} XP (Có: {xp.toLocaleString()} XP)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Realm Specs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Phẩm Cấp Thần Thông:</div>
              <div style={{ fontSize: '11.5px', color: '#86efac', fontWeight: 800, marginTop: '2px' }}>{realmLore.realmType}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Tỉ Lệ Đột Phá:</div>
              <div style={{ fontSize: '11.5px', color: '#fde047', fontWeight: 800, marginTop: '2px' }}>{realmLore.breakthroughRate}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Linh Hào Quang:</div>
              <div style={{ fontSize: '11.5px', color: '#c084fc', fontWeight: 800, marginTop: '2px' }}>{realmLore.elementAura}</div>
            </div>
          </div>

          {/* Rich Cultivation Lore Box */}
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '12.5px',
              color: '#cbd5e1',
              lineHeight: '1.6',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'left',
              marginBottom: '12px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#fbbf24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen style={{ width: '13px', height: '13px' }} /> 📜 ĐIỂN TÍCH & ĐẶC TÍNH CẢNH GIỚI:
            </div>
            {realmLore.lore}
          </div>

          {/* Power Perks Box */}
          <div
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#fde68a',
              lineHeight: '1.5',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'left',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#86efac', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap style={{ width: '13px', height: '13px' }} /> ⚡ NĂNG LỰC & ĐẶC QUYỀN CẢNH GIỚI:
            </div>
            {realmLore.powerPerks}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            if (isSelectedUnlocked) {
              onSelectSkin(selectedLvl.skinId, selectedLvl.name);
            }
          }}
          disabled={!isSelectedUnlocked || isSelectedEquipped}
          style={{
            width: '100%',
            background: isSelectedEquipped
              ? 'rgba(100,116,139,0.3)'
              : isSelectedUnlocked
              ? 'linear-gradient(135deg,#f59e0b,#d97706)'
              : 'rgba(50,50,50,0.4)',
            border: `1.5px solid ${isSelectedUnlocked && !isSelectedEquipped ? '#fde047' : 'transparent'}`,
            borderRadius: '12px',
            padding: '13px',
            color: isSelectedEquipped ? '#94a3b8' : isSelectedUnlocked ? '#000' : '#64748b',
            fontWeight: 900,
            fontSize: '13.5px',
            cursor: isSelectedUnlocked && !isSelectedEquipped ? 'pointer' : 'not-allowed',
            boxShadow: isSelectedUnlocked && !isSelectedEquipped ? '0 0 20px rgba(245,158,11,0.4)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Sparkles style={{ width: '18px', height: '18px' }} />
          {isSelectedEquipped ? 'ĐANG MẶC THÂN PHÁP NÀY' : isSelectedUnlocked ? '🥋 MẶC THÂN PHÁP NÀY' : '🔒 CHƯA ĐẠT CẢNH GIỚI'}
        </button>
      </div>
    </div>
  );
};
