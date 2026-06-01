import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', background: '#0d1117', display: 'flex', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {children}
      </main>
    </div>
  );
}
