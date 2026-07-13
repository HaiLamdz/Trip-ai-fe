import Link from 'next/link';

const FEATURES = [
  {
    icon: '✦',
    title: 'Lịch trình Trip AI',
    desc: 'Tạo kế hoạch từng bước siêu cá nhân hóa, thích nghi với nhịp độ, sở thích và thay đổi thời tiết thực tế của bạn.',
  },
  {
    icon: '◈',
    title: 'Quản lý ngân sách',
    desc: 'Dự toán chi phí thời gian thực cho vé máy bay, chỗ ở và ăn uống. Theo dõi mọi khoản chi theo nhiều loại tiền tệ.',
  },
  {
    icon: '⟳',
    title: 'Đồng bộ thời gian thực',
    desc: 'Lịch trình cập nhật trực tiếp cho tất cả thành viên trong nhóm. Truy cập ngoại tuyến để không bỏ lỡ bất kỳ điểm đến nào.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">✈</span>
            TripAI
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-4">Đăng nhập</Link>
            <Link href="/register" className="btn-primary px-3 py-2.5 text-xs sm:px-4 sm:text-sm">Bắt đầu</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto grid max-w-7xl items-center gap-8 text-center sm:gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:text-left">
            <div className="mx-auto max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Được hỗ trợ bởi Trip AI
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Kiến trúc sư du lịch thông minh cho mọi hành trình.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Lên kế hoạch chuyến đi hoàn hảo trong vài phút, không phải vài giờ. TripAI gợi ý lịch trình, ngân sách và điểm đến phù hợp với phong cách của bạn.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/register" className="btn-primary w-full px-6 py-3 sm:w-auto">Bắt đầu lên kế hoạch</Link>
                <a href="#features" className="btn-outline w-full px-6 py-3 sm:w-auto">Xem tính năng</a>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:rounded-[32px] sm:p-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Hành trình Tokyo 3 ngày</span>
                    <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-blue-300">AI đang tối ưu</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Morning</p>
                      <p className="mt-2 font-semibold">Phở Bát Đàn</p>
                      <p className="mt-1 text-sm text-slate-400">Ăn sáng nhẹ và thư giãn</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Afternoon</p>
                      <p className="mt-2 font-semibold">Phố Cổ và hồ Hoàn Kiếm</p>
                      <p className="mt-1 text-sm text-slate-400">Tham quan và chụp hình</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Tính năng nổi bật</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Thiết kế vừa đẹp vừa thông minh.</h2>
            </div>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="section-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">{feature.icon}</div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-slate-700">TripAI</span>
          <div className="flex gap-4">
            <a href="/login" className="hover:text-slate-900">Đăng nhập</a>
            <a href="/register" className="hover:text-slate-900">Đăng ký</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
