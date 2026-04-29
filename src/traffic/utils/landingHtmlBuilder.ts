import type { LandingPublisherContent, LandingPublisherDesign } from '../types'

export function buildLandingHTML(
  content: LandingPublisherContent,
  productName: string,
  design: LandingPublisherDesign
): string {
  const primary = content.primary_color || (design === 'dark_modern' ? '#7c3aed' : design === 'clean_white' ? '#2563eb' : '#f59e0b')
  const accent = content.accent_color || (design === 'dark_modern' ? '#10b981' : design === 'clean_white' ? '#059669' : '#ef4444')
  const bg = design === 'clean_white' ? '#ffffff' : '#0a0a0a'
  const bgCard = design === 'clean_white' ? '#f8fafc' : '#111111'
  const bgSection = design === 'clean_white' ? '#f1f5f9' : '#0d0d0d'
  const textMain = design === 'clean_white' ? '#0f172a' : '#ffffff'
  const textMuted = design === 'clean_white' ? '#64748b' : '#9ca3af'
  const border = design === 'clean_white' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'

  const benefitsHTML = (content.benefits ?? []).map(b => `
    <div class="benefit-card">
      <div class="benefit-icon">${b.icon}</div>
      <h3 class="benefit-title">${b.title}</h3>
      <p class="benefit-desc">${b.description}</p>
    </div>`).join('')

  const testimonialsHTML = (content.testimonials ?? []).map(t => `
    <div class="testimonial-card">
      <div class="testimonial-result">${t.result}</div>
      <p class="testimonial-text">"${t.text}"</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${t.name.slice(0, 1)}</div>
        <div>
          <div class="testimonial-name">${t.name}</div>
          <div class="testimonial-role">${t.role}</div>
        </div>
      </div>
    </div>`).join('')

  const offerItemsHTML = (content.offer_items ?? []).map(item => `
    <li class="offer-item">
      <span class="offer-check">✓</span>
      <span>${item}</span>
    </li>`).join('')

  const problemItemsHTML = (content.problem_items ?? []).map(item => `
    <div class="problem-item">
      <span class="problem-x">✗</span>
      <span>${item}</span>
    </div>`).join('')

  const faqHTML = (content.faq ?? []).map((f, i) => `
    <details class="faq-item" ${i === 0 ? 'open' : ''}>
      <summary class="faq-question">${f.question}<span class="faq-arrow">▾</span></summary>
      <div class="faq-answer">${f.answer}</div>
    </details>`).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.meta_title || productName}</title>
  <meta name="description" content="${content.meta_description || ''}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: ${primary};
      --accent: ${accent};
      --bg: ${bg};
      --bg-card: ${bgCard};
      --bg-section: ${bgSection};
      --text: ${textMain};
      --text-muted: ${textMuted};
      --border: ${border};
    }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .container-narrow { max-width: 760px; margin: 0 auto; padding: 0 24px; }
    .btn-primary {
      display: inline-block;
      background: var(--primary);
      color: #fff;
      padding: 18px 48px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s, transform 0.1s;
      text-align: center;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .section { padding: 80px 0; }
    .section-alt { background: var(--bg-section); }
    .section-title {
      font-size: clamp(28px, 4vw, 42px);
      font-weight: 800;
      text-align: center;
      margin-bottom: 16px;
      line-height: 1.2;
    }
    .section-subtitle {
      font-size: 18px;
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 48px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    /* NAV */
    nav {
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      background: var(--bg);
      z-index: 100;
    }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { font-size: 20px; font-weight: 800; color: var(--primary); }
    .nav-cta {
      background: var(--primary);
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }
    .nav-cta:hover { opacity: 0.9; }
    /* HERO */
    #hero {
      padding: 80px 0 60px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% -10%, ${primary}22, transparent 70%);
      pointer-events: none;
    }
    .hero-badge {
      display: inline-block;
      background: ${primary}22;
      color: ${primary};
      border: 1px solid ${primary}44;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .hero-headline {
      font-size: clamp(36px, 6vw, 72px);
      font-weight: 900;
      line-height: 1.05;
      margin-bottom: 20px;
      letter-spacing: -1px;
    }
    .hero-headline span { color: var(--primary); }
    .hero-sub {
      font-size: clamp(16px, 2.5vw, 20px);
      color: var(--text-muted);
      max-width: 680px;
      margin: 0 auto 36px;
    }
    .hero-cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .hero-cta { width: 100%; max-width: 380px; font-size: 20px; padding: 20px; border-radius: 14px; }
    .hero-secondary { font-size: 13px; color: var(--text-muted); }
    .hero-trust {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 40px;
      flex-wrap: wrap;
    }
    .hero-trust-item { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
    /* PROBLEM */
    .problem-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 40px;
    }
    .problem-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      font-size: 15px;
    }
    .problem-x { color: #ef4444; font-size: 18px; font-weight: 700; flex-shrink: 0; }
    /* SOLUTION */
    .solution-box {
      background: var(--bg-card);
      border: 1px solid ${primary}33;
      border-radius: 20px;
      padding: 48px;
      margin-top: 40px;
    }
    .solution-label {
      display: inline-block;
      background: ${primary}22;
      color: ${primary};
      border: 1px solid ${primary}44;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    .solution-desc { font-size: 17px; color: var(--text-muted); line-height: 1.7; margin-bottom: 20px; }
    .solution-mechanism {
      background: ${accent}11;
      border: 1px solid ${accent}33;
      border-radius: 10px;
      padding: 16px 20px;
      font-size: 15px;
      color: ${accent};
      font-weight: 500;
    }
    /* BENEFITS */
    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 40px;
    }
    .benefit-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      transition: border-color 0.2s;
    }
    .benefit-card:hover { border-color: ${primary}55; }
    .benefit-icon { font-size: 32px; margin-bottom: 14px; }
    .benefit-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
    .benefit-desc { font-size: 14px; color: var(--text-muted); line-height: 1.6; }
    /* TESTIMONIALS */
    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 40px;
    }
    .testimonial-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
    }
    .testimonial-result {
      background: ${accent}22;
      color: ${accent};
      border: 1px solid ${accent}44;
      border-radius: 100px;
      padding: 4px 12px;
      font-size: 13px;
      font-weight: 700;
      display: inline-block;
      margin-bottom: 16px;
    }
    .testimonial-text {
      font-size: 15px;
      line-height: 1.7;
      color: var(--text-muted);
      margin-bottom: 20px;
      font-style: italic;
    }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .testimonial-avatar {
      width: 40px; height: 40px;
      background: var(--primary);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px; color: #fff;
      flex-shrink: 0;
    }
    .testimonial-name { font-weight: 600; font-size: 14px; }
    .testimonial-role { font-size: 12px; color: var(--text-muted); }
    .results-stat {
      text-align: center;
      font-size: clamp(24px, 4vw, 40px);
      font-weight: 900;
      color: var(--primary);
      margin-top: 48px;
    }
    /* OFFER */
    #offer {
      padding: 80px 0;
      background: radial-gradient(ellipse 80% 80% at 50% 50%, ${primary}15, transparent 70%);
    }
    .offer-box {
      max-width: 640px;
      margin: 40px auto 0;
      background: var(--bg-card);
      border: 2px solid ${primary}55;
      border-radius: 24px;
      padding: 48px;
      text-align: center;
    }
    .offer-price-area { margin-bottom: 32px; }
    .offer-original {
      font-size: 20px;
      color: var(--text-muted);
      text-decoration: line-through;
      margin-bottom: 4px;
    }
    .offer-price { font-size: 60px; font-weight: 900; color: var(--text); line-height: 1; }
    .offer-list {
      list-style: none;
      text-align: left;
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .offer-item { display: flex; align-items: flex-start; gap: 10px; font-size: 15px; }
    .offer-check { color: ${accent}; font-weight: 700; flex-shrink: 0; }
    .offer-cta { width: 100%; font-size: 20px; padding: 20px; border-radius: 14px; margin-bottom: 12px; }
    .offer-urgency { font-size: 13px; color: #f59e0b; font-weight: 600; }
    /* GUARANTEE */
    #guarantee { text-align: center; }
    .guarantee-shield { font-size: 64px; margin-bottom: 20px; }
    .guarantee-headline {
      font-size: clamp(24px, 4vw, 36px);
      font-weight: 800;
      margin-bottom: 16px;
    }
    .guarantee-text {
      font-size: 17px;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.7;
    }
    /* FAQ */
    .faq-list { margin-top: 40px; display: flex; flex-direction: column; gap: 12px; }
    .faq-item {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .faq-question {
      padding: 20px 24px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .faq-question::-webkit-details-marker { display: none; }
    .faq-arrow { font-size: 18px; color: var(--primary); transition: transform 0.2s; }
    details[open] .faq-arrow { transform: rotate(180deg); }
    .faq-answer {
      padding: 0 24px 20px;
      font-size: 15px;
      color: var(--text-muted);
      line-height: 1.7;
    }
    /* FINAL CTA */
    #final-cta {
      text-align: center;
      padding: 100px 0;
      background: radial-gradient(ellipse 80% 80% at 50% 100%, ${primary}20, transparent 60%);
    }
    .final-cta-headline {
      font-size: clamp(32px, 5vw, 56px);
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 16px;
    }
    .final-cta-sub {
      font-size: 18px;
      color: var(--text-muted);
      margin-bottom: 40px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }
    .final-cta-btn { font-size: 20px; padding: 22px 64px; border-radius: 14px; }
    /* FOOTER */
    footer {
      border-top: 1px solid var(--border);
      padding: 32px 0;
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
    }
    /* RESPONSIVE */
    @media (max-width: 640px) {
      .section { padding: 60px 0; }
      .hero-headline { font-size: 36px; }
      .solution-box { padding: 28px 20px; }
      .offer-box { padding: 32px 20px; }
      .offer-price { font-size: 48px; }
      .btn-primary, .nav-cta { font-size: 16px; }
      .hero-trust { gap: 12px; }
    }
  </style>
</head>
<body>

<!-- NAVIGATION -->
<nav>
  <div class="container nav-inner">
    <span class="nav-logo">${productName}</span>
    <button class="nav-cta" onclick="document.getElementById('offer').scrollIntoView({behavior:'smooth'})">${content.hero_cta_text || 'Comprar Agora'}</button>
  </div>
</nav>

<!-- HERO -->
<section id="hero" class="section">
  <div class="hero-bg"></div>
  <div class="container-narrow">
    <div class="hero-badge">✦ ${content.solution_mechanism || productName}</div>
    <h1 class="hero-headline">${content.hero_headline || 'A Solução Que Você Precisava'}</h1>
    <p class="hero-sub">${content.hero_subheadline || ''}</p>
    <div class="hero-cta-wrap">
      <button class="btn-primary hero-cta" onclick="document.getElementById('offer').scrollIntoView({behavior:'smooth'})">${content.hero_cta_text || 'Quero Acesso Agora'}</button>
      <span class="hero-secondary">${content.hero_secondary_text || 'Sem riscos. Garantia total.'}</span>
    </div>
    <div class="hero-trust">
      <span class="hero-trust-item">🔒 Pagamento Seguro</span>
      <span class="hero-trust-item">✅ Garantia de ${content.guarantee_days || 30} Dias</span>
      <span class="hero-trust-item">⚡ Acesso Imediato</span>
    </div>
  </div>
</section>

<!-- PROBLEM -->
<section class="section section-alt">
  <div class="container">
    <h2 class="section-title">${content.problem_headline || 'Você Reconhece Algum Desses Problemas?'}</h2>
    <div class="problem-grid">${problemItemsHTML}</div>
  </div>
</section>

<!-- SOLUTION -->
<section class="section">
  <div class="container-narrow">
    <h2 class="section-title">${content.solution_headline || 'A Solução'}</h2>
    <div class="solution-box">
      <div class="solution-label">A Solução</div>
      <p class="solution-desc">${content.solution_description || ''}</p>
      <div class="solution-mechanism">⚡ ${content.solution_mechanism || ''}</div>
    </div>
  </div>
</section>

<!-- BENEFITS -->
<section class="section section-alt">
  <div class="container">
    <h2 class="section-title">${content.benefits_headline || 'O Que Você Vai Conquistar'}</h2>
    <div class="benefits-grid">${benefitsHTML}</div>
  </div>
</section>

<!-- PROOF -->
<section class="section">
  <div class="container">
    <h2 class="section-title">${content.proof_headline || 'Resultados Reais de Clientes Reais'}</h2>
    <div class="testimonials-grid">${testimonialsHTML}</div>
    ${content.results_stat ? `<div class="results-stat">${content.results_stat}</div>` : ''}
  </div>
</section>

<!-- OFFER -->
<section id="offer">
  <div class="container">
    <h2 class="section-title">${content.offer_headline || 'Oferta Especial'}</h2>
    <div class="offer-box">
      <div class="offer-price-area">
        ${content.offer_original_price ? `<div class="offer-original">${content.offer_original_price}</div>` : ''}
        <div class="offer-price">${content.offer_price || ''}</div>
      </div>
      <ul class="offer-list">${offerItemsHTML}</ul>
      <button class="btn-primary offer-cta" onclick="alert('Direcionando para o checkout...')">${content.offer_cta_text || 'Quero Agora'}</button>
      ${content.offer_urgency ? `<div class="offer-urgency">⏰ ${content.offer_urgency}</div>` : ''}
    </div>
  </div>
</section>

<!-- GUARANTEE -->
<section id="guarantee" class="section section-alt">
  <div class="container-narrow">
    <div class="guarantee-shield">🛡️</div>
    <h2 class="guarantee-headline">${content.guarantee_headline || `Garantia de ${content.guarantee_days || 30} Dias`}</h2>
    <p class="guarantee-text">${content.guarantee_text || ''}</p>
  </div>
</section>

<!-- FAQ -->
<section class="section">
  <div class="container-narrow">
    <h2 class="section-title">${content.faq_headline || 'Perguntas Frequentes'}</h2>
    <div class="faq-list">${faqHTML}</div>
  </div>
</section>

<!-- FINAL CTA -->
<section id="final-cta">
  <div class="container-narrow">
    <h2 class="final-cta-headline">${content.final_headline || 'Comece Agora Mesmo'}</h2>
    <p class="final-cta-sub">${content.final_subheadline || ''}</p>
    <button class="btn-primary final-cta-btn" onclick="document.getElementById('offer').scrollIntoView({behavior:'smooth'})">${content.final_cta_text || 'Garantir Meu Acesso'}</button>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="container">
    <p>© ${new Date().getFullYear()} ${productName}. Todos os direitos reservados.</p>
    <p style="margin-top:8px; font-size:11px; opacity:0.6;">Gerado com TrafficOS · Landing Page Publisher</p>
  </div>
</footer>

</body>
</html>`
}
