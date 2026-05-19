// ============================================================
// UISA — components/DemoBanner.tsx
// Banner de aviso exibido no topo em DEMO_MODE
// ============================================================

export function DemoBanner() {
  return (
    <div
      style={{
        position:        'fixed',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          9999,
        background:      'linear-gradient(90deg, #FFCF01 0%, #f5a623 100%)',
        color:           '#07140a',
        textAlign:       'center',
        padding:         '6px 16px',
        fontSize:        '13px',
        fontWeight:      700,
        letterSpacing:   '0.02em',
        boxShadow:       '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      🔍 MODO DEMONSTRAÇÃO — dados fictícios para visualização. Nenhuma informação é salva.
    </div>
  )
}
