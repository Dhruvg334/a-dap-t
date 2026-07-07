export function ReportSkeleton() {
  return (
    <main className="adapt-page report-workspace-page" style={{ paddingTop: '100px' }}>
      <div className="adapt-container" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px', alignItems: 'start', maxWidth: '1440px', pointerEvents: 'none', opacity: 0.8 }}>
        
        {/* Sidebar Skeleton */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '100px' }}>
          <nav aria-label="Report panels" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="shimmer-block" style={{ width: '100%', height: '42px', borderRadius: '12px' }} />
            ))}
          </nav>
        </aside>

        {/* Main Content Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
          
          {/* Header Skeleton */}
          <header className="shimmer" style={{ padding: '40px', background: 'var(--adapt-surface)', border: '1px solid var(--adapt-border)', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div className="shimmer-block" style={{ width: '180px', height: '14px', marginBottom: '16px' }} />
              <div className="shimmer-block" style={{ width: '60%', height: '56px', borderRadius: '8px', marginBottom: '8px' }} />
              <div className="shimmer-block" style={{ width: '40%', height: '16px', borderRadius: '4px' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
              <div className="shimmer-block" style={{ width: '140px', height: '40px', borderRadius: '99px' }} />
              <div className="shimmer-block" style={{ width: '100px', height: '40px', borderRadius: '99px' }} />
              <div className="shimmer-block" style={{ width: '100px', height: '40px', borderRadius: '99px' }} />
            </div>
          </header>

          {/* Overview Panel Skeleton */}
          <section className="report-panel-stage" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="report-panel-content overview-panel refined">
              <section className="overview-release-card adapt-panel shimmer" style={{ minHeight: '280px', padding: '34px' }}>
                <div className="shimmer-block" style={{ width: '120px', height: '14px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                   <div className="shimmer-block" style={{ width: '240px', height: '60px', borderRadius: '8px' }} />
                   <div className="shimmer-block" style={{ width: '160px', height: '60px', borderRadius: '24px' }} />
                </div>
                <div className="shimmer-block" style={{ width: '70%', height: '16px', marginTop: '24px', borderRadius: '4px' }} />
                <div className="shimmer-block" style={{ width: '40%', height: '16px', marginTop: '8px', borderRadius: '4px' }} />
                
                <div className="overview-score-row compact" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '40px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="shimmer-block" style={{ height: '80px', borderRadius: '12px' }} />
                  ))}
                </div>
              </section>

              <section className="overview-action-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div className="adapt-panel shimmer" style={{ minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                  <div className="shimmer-block" style={{ width: '120px', height: '24px', borderRadius: '6px' }} />
                  <div className="shimmer-block" style={{ width: '100%', height: '24px', borderRadius: '6px' }} />
                  <div className="shimmer-block" style={{ width: '80%', height: '24px', borderRadius: '6px' }} />
                  <div className="shimmer-block" style={{ width: '90%', height: '24px', borderRadius: '6px' }} />
                </div>
                <div className="adapt-panel shimmer" style={{ minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                  <div className="shimmer-block" style={{ width: '140px', height: '24px', borderRadius: '6px' }} />
                  <div className="shimmer-block" style={{ width: '95%', height: '24px', borderRadius: '6px' }} />
                  <div className="shimmer-block" style={{ width: '85%', height: '24px', borderRadius: '6px' }} />
                  <div className="shimmer-block" style={{ width: '75%', height: '24px', borderRadius: '6px' }} />
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
