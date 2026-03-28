import NotificationBell from '../layout/NotificationBell'

/**
 * Page — standard page wrapper used by every role view.
 *
 * Desktop: ml-[220px] to clear fixed sidebar.
 * Mobile:  ml-0 (sidebar is a drawer overlay) + sticky header at top-12
 *          (below the 48px AppLayout mobile top bar).
 */
export function Page({ title, subtitle, actions, children, noPad = false }) {
  return (
    <div className="ml-0 md:ml-[220px] min-h-screen bg-gray-50/80">
      <header className="bg-white border-b border-gray-100 sticky top-12 md:top-0 z-40">
        <div className="px-4 md:px-8 py-4 flex items-center justify-between max-w-[1400px]">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="text-[17px] font-bold text-gray-900 tracking-tight leading-none truncate">{title}</h2>
            {subtitle && <p className="text-[12px] text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <NotificationBell />
          </div>
        </div>
      </header>
      <main className={noPad ? '' : 'px-4 md:px-8 py-6 max-w-[1400px] anim-up'}>
        {children}
      </main>
    </div>
  )
}
