import Link from 'next/link';

const FEATURES = [
  {
    icon: '✦',
    title: 'Lịch trình Trip AI',
    desc: 'Tạo kế hoạch từng bước siêu cá nhân hóa, thích nghi với nhịp độ, sở thích và thay đổi thời tiết thực tế của bạn.',
    link: 'Tìm hiểu thêm',
  },
  {
    icon: '◈',
    title: 'Quản lý ngân sách',
    desc: 'Dự toán chi phí thời gian thực cho vé máy bay, chỗ ở và ăn uống. Theo dõi mọi khoản chi theo nhiều loại tiền tệ.',
    link: 'Xem bảng giá',
  },
  {
    icon: '⟳',
    title: 'Đồng bộ thời gian thực',
    desc: 'Lịch trình cập nhật trực tiếp cho tất cả thành viên trong nhóm. Truy cập ngoại tuyến để không bỏ lỡ bất kỳ điểm đến nào.',
    link: 'Khám phá ứng dụng',
  },
];

const SAMPLE_ACTIVITIES = [
  { time: '08:00', title: 'Ăn sáng Phở Bát Đàn', type: 'food' },
  { time: '09:30', title: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn', type: 'attraction' },
  { time: '11:00', title: 'Khám phá Phố Cổ 36 phố phường', type: 'attraction' },
  { time: '12:30', title: 'Bún Chả Hương Liên', type: 'food' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#080c1a', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(8,12,26,0.85)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>✈ TripAI</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, padding: '6px 14px', borderRadius: 8, textDecoration: 'none', transition: 'color 0.2s' }}>
              Đăng nhập
            </Link>
            <Link href="/register" style={{ background: '#4f6ef7', color: '#fff', fontSize: 14, fontWeight: 600, padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow background */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(79,110,247,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)', borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f6ef7', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Được hỗ trợ bởi Trip AI</span>
          </div>

          <h1 style={{ fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24, color: '#fff' }}>
            Kiến trúc sư<br />Du lịch AI
          </h1>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
            Lên kế hoạch chuyến đi hoàn hảo trong vài giây, không phải vài giờ. Được hỗ trợ bởi Trip AI và dữ liệu du lịch thời gian thực để mang đến lịch trình được cá nhân hóa cho bạn.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ background: '#4f6ef7', color: '#fff', fontWeight: 600, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Bắt đầu lên kế hoạch miễn phí
            </Link>
            <a href="#demo" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Xem Demo
            </a>
          </div>
        </div>

        {/* ── App Preview Card ── */}
        <div id="demo" style={{ maxWidth: 860, margin: '72px auto 0', padding: '0 24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            {/* Window chrome */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 24, marginLeft: 12, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Khám phá Tokyo...</span>
              </div>
            </div>

            {/* Map area */}
            <div style={{ position: 'relative', height: 280, background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #091420 100%)', overflow: 'hidden' }}>
              {/* Grid lines */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
                {[...Array(8)].map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={`${i * 14}%`} x2="100%" y2={`${i * 14}%`} stroke="#4f6ef7" strokeWidth="0.5" />
                ))}
                {[...Array(12)].map((_, i) => (
                  <line key={`v${i}`} x1={`${i * 9}%`} y1="0" x2={`${i * 9}%`} y2="100%" stroke="#4f6ef7" strokeWidth="0.5" />
                ))}
                {/* Route lines */}
                <polyline points="120,200 220,140 380,100 520,160 680,80" fill="none" stroke="#4f6ef7" strokeWidth="2" strokeDasharray="6,3" opacity="0.8" />
                <polyline points="120,200 220,140 380,100 520,160 680,80" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.4" />
              </svg>

              {/* Markers */}
              {[
                { x: '14%', y: '72%', label: '1' },
                { x: '26%', y: '50%', label: '2' },
                { x: '44%', y: '36%', label: '3' },
                { x: '61%', y: '58%', label: '4' },
                { x: '79%', y: '28%', label: '5' },
              ].map(m => (
                <div key={m.label} style={{ position: 'absolute', left: m.x, top: m.y, transform: 'translate(-50%,-50%)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: '#4f6ef7', border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 0 12px rgba(79,110,247,0.6)' }} />
                  <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.label}</span>
                </div>
              ))}

              {/* AI suggestion chip */}
              <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(79,110,247,0.9)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#fff', fontWeight: 500 }}>
                ✦ Gợi ý từ Trip AI: Shibuya từ đây
              </div>
            </div>

            {/* Timeline preview */}
            <div style={{ padding: '20px 24px', display: 'flex', gap: 12, overflowX: 'auto' }}>
              {SAMPLE_ACTIVITIES.map((act, i) => (
                <div key={i} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{act.time}</div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.3 }}>{act.title}</div>
                  <div style={{ marginTop: 8, display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 100, background: act.type === 'food' ? 'rgba(249,115,22,0.2)' : 'rgba(79,110,247,0.2)', color: act.type === 'food' ? '#fb923c' : '#818cf8' }}>
                    {act.type === 'food' ? '🍜 Ẩm thực' : '🏛 Tham quan'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', color: '#fff', marginBottom: 16 }}>
            Thiết kế cho thập kỷ tiếp theo
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 420, margin: '0 auto' }}>
            Bỏ qua bảng tính. Trip AI xử lý mọi logistics trong khi bạn tập trung vào những kỷ niệm.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px', transition: 'border-color 0.2s' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#818cf8', marginBottom: 20 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '-0.3px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 20 }}>{f.desc}</p>
              <a href="/register" style={{ fontSize: 13, color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {f.link} →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 24px 100px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(79,110,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '56px 40px' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-1.5px', color: '#fff', marginBottom: 14 }}>
            Sẵn sàng khám phá thế giới theo cách khác?
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 36, lineHeight: 1.6 }}>
            Tham gia cùng hơn 500.000 du khách đã từ bỏ nỗi lo lên kế hoạch và đón nhận niềm vui khám phá.
          </p>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#0a0f1e', fontWeight: 700, fontSize: 15, padding: '13px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Bắt đầu hành trình của bạn
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {['👩', '👨', '👩‍🦰', '🧑'].map((a, i) => (
              <span key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{a}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>TripAI</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Chính sách', 'Điều khoản', 'Liên hệ'].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2025 TripAI Inc. Bảo lưu mọi quyền.</span>
      </footer>
    </div>
  );
}
