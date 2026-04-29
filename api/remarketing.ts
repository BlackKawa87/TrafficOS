import OpenAI from 'openai'

export const config = { runtime: 'edge' }

export const maxDuration = 60

const client = new OpenAI()

const SYSTEM_PROMPT = `Você é um especialista sênior em remarketing, retargeting e recuperação de audiência para tráfego pago.

Sua função é analisar dados de um produto e gerar uma ESTRATÉGIA COMPLETA DE REMARKETING com públicos segmentados, criativos específicos, mensagens por público e plano por fase.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE PÚBLICO OBRIGATÓRIOS (gere os 5):
▸ visitou_nao_comprou — visitantes que chegaram à página de vendas mas não compraram
▸ clicou_nao_converteu — usuários que clicaram no anúncio mas não converteram
▸ assistiu_video — usuários que assistiram ≥ 50% do vídeo do anúncio
▸ abandonou_checkout — chegaram ao checkout mas não finalizaram
▸ lead_nao_convertido — leads capturados que não viraram clientes

NÍVEIS DE INTENÇÃO:
▸ alto = abandonou_checkout, lead_nao_convertido
▸ medio = visitou_nao_comprou, clicou_nao_converteu
▸ baixo = assistiu_video

ESTRATÉGIA POR FASE (3 fases obrigatórias):
▸ Fase 1 (Dia 1–2): lembranca — tom suave, recordar sem pressão
▸ Fase 2 (Dia 3–5): prova — depoimentos, resultados, prova social
▸ Fase 3 (Dia 5–7): urgencia — escassez real, prazo, CTA direto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANTE: Retorne APENAS JSON válido — um objeto com a estrutura exata abaixo.
Use os dados reais do produto para personalizar cada seção.

{
  "resumo_executivo": "<2-3 parágrafos: diagnóstico do funil baseado nos dados, oportunidade de remarketing identificada, impacto esperado com números quando disponíveis>",

  "publicos": [
    {
      "tipo": "<visitou_nao_comprou | clicou_nao_converteu | assistiu_video | abandonou_checkout | lead_nao_convertido>",
      "nome": "<nome específico e descritivo — ex: 'Visitantes da Página de Vendas (últimos 30 dias)'>",
      "tamanho_estimado": "<ex: '500–2.000 pessoas' baseado nos dados disponíveis, ou 'Estimativa requer Pixel instalado'>",
      "nivel_intencao": "<baixo | medio | alto>",
      "descricao": "<por que este público importa, o que o comportamento indica, qual o potencial de conversão>",
      "criativo_video": {
        "script_completo": "<roteiro detalhado 15–30s: HOOK 0–3s (texto falado + texto tela) → DESENVOLVIMENTO 3–20s → CTA 20–30s. Cada momento com falas exatas e texto na tela>",
        "abordagem_emocional": "<emoção dominante e por quê funciona para este público específico — FOMO, urgência, esperança, validação social, alívio>",
        "cta": "<CTA específico e direto para este público — ex: 'Volte e garanta sua vaga — últimas horas'>"
      },
      "criativo_imagem": {
        "headline": "<headline impactante personalizada para este público — máximo 8 palavras>",
        "layout": "<descrição detalhada: fundo (cor/foto), posição do headline, posição da imagem do produto, posição do CTA, hierarquia visual, estilo>",
        "cta": "<texto do botão — ex: 'Garantir agora com desconto'>"
      },
      "mensagens": {
        "urgencia": "<mensagem de urgência baseada em prazo ou disponibilidade — específica para este público>",
        "escassez": "<mensagem de escassez real ou percebida — vagas, unidades, bônus por tempo limitado>",
        "reforco_valor": "<reforçar o principal benefício ou transformação que este público ainda não viu ou não acreditou totalmente>",
        "quebra_objecao": "<identificar a principal objeção deste público e a resposta direta que a quebra>"
      }
    }
  ],

  "estrategia_por_fase": [
    {
      "fase": "lembranca",
      "periodo": "Dia 1–2",
      "objetivo": "<objetivo específico desta fase para este produto>",
      "abordagem": "<tom, linguagem e estratégia de comunicação nesta fase>",
      "criativos_recomendados": ["<tipo 1 — ex: vídeo curto 15s com depoimento>", "<tipo 2>", "<tipo 3 se necessário>"],
      "frequencia": "<ex: '1–2 impressões/dia/usuário — não saturar ainda'>"
    },
    {
      "fase": "prova",
      "periodo": "Dia 3–5",
      "objetivo": "<objetivo>",
      "abordagem": "<abordagem>",
      "criativos_recomendados": ["<tipo 1>", "<tipo 2>"],
      "frequencia": "<frequência>"
    },
    {
      "fase": "urgencia",
      "periodo": "Dia 5–7",
      "objetivo": "<objetivo>",
      "abordagem": "<abordagem>",
      "criativos_recomendados": ["<tipo 1>", "<tipo 2>"],
      "frequencia": "<frequência>"
    }
  ],

  "orcamento_recomendado": {
    "percentual_do_total": <número inteiro entre 10 e 30>,
    "justificativa": "<por que este percentual faz sentido dado o estágio do produto, volume de tráfego e dados disponíveis>",
    "distribuicao_por_fase": "<como dividir o orçamento entre as 3 fases — ex: '30% fase 1, 40% fase 2, 30% fase 3'>"
  },

  "frequencia_ideal": {
    "frequencia_diaria": "<ex: '2–3 impressões/dia na fase de lembrança, 3–4 na fase de urgência'>",
    "janela_retargeting": "<janela de lookback recomendada por público — ex: '7 dias para checkout, 30 dias para visitantes'>",
    "recomendacao": "<orientação estratégica sobre frequência baseada no produto, preço e ciclo de decisão do cliente>"
  }
}

ALERTAS:
- Personalize os criativos com o nome/promessa/mecanismo do produto — não use textos genéricos
- Se dados de métricas forem escassos, mencione isso no resumo_executivo mas ainda gere a estratégia
- Scripts de vídeo devem ter no mínimo 6 linhas de roteiro (hook + desenvolvimento + CTA)`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { contextData } = (await req.json()) as { contextData: string }

  if (!contextData) {
    return json({ error: 'Context data is required' }, 400)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise os dados abaixo e gere a estratégia completa de remarketing:

${contextData}

IMPORTANTE:
- Use os dados reais do produto para personalizar cada público e criativo
- Gere os 5 públicos obrigatórios com criativos completos
- Retorne APENAS o JSON válido (objeto) sem markdown ou texto extra`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422)
    }

    const strategy = JSON.parse(jsonMatch[0])
    return json({ strategy })
  } catch (err) {
    console.error('Remarketing API error:', err)
    return json({ error: 'Failed to generate remarketing strategy. Please try again.' }, 500)
  }
}
