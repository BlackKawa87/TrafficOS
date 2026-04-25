import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista em design de landing pages de alta conversão, copywriting de resposta direta e UX para tráfego pago.

Sua função é gerar uma landing page COMPLETA e EXECUTÁVEL — wireframe, layout, copy posicionada e direção de design — pronta para ser criada por qualquer designer ou desenvolvedor sem precisar interpretar.

REGRAS:
- Cada bloco deve ter copy pronta para colocar diretamente na página.
- O layout deve ser descrito com posições, tamanhos e hierarquia visual.
- A paleta de cores deve ter hex codes reais.
- Nada genérico — use os dados reais do produto.
- Se não há diagnóstico de oferta, use os dados do produto diretamente.

BLOCOS DISPONÍVEIS (use os que fazem sentido para o produto):
- hero: seção principal acima da dobra
- problema: apresentação do problema do público
- solucao: apresentação da solução
- como_funciona: como o produto funciona (passo a passo)
- beneficios: lista de benefícios em cards
- prova: depoimentos, provas sociais, resultados
- garantia: garantia do produto
- oferta: preço, condições, urgência
- faq: perguntas frequentes
- cta_final: chamada para ação final

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON.

SCHEMA JSON OBRIGATÓRIO:
{
  "page_title": "<título SEO da página>",
  "meta_description": "<meta description 155 chars>",
  "objetivo": "<objetivo principal da página: venda direta | captura de lead | agendamento | etc>",
  "blocos": [
    {
      "tipo": "<tipo do bloco>",
      "layout": {
        "posicao_texto": "<centro | esquerda | direita>",
        "posicao_imagem": "<direita | esquerda | fundo | acima | abaixo | nenhuma>",
        "espacamento": "<alto: padding 80-120px | medio: 60px | compacto: 40px>",
        "hierarquia": "<ex: headline enorme, subtítulo médio, body pequeno, CTA botão grande>",
        "notas": "<instruções de layout adicionais: ex: 'headline centralizado, CTA com seta animada, fundo escuro'>"
      },
      "copy": {
        "headline": "<headline principal do bloco — pronta para usar>",
        "subheadline": "<subtítulo ou reforço — pronto para usar>",
        "corpo": "<texto do corpo — parágrafos prontos para usar>",
        "lista_itens": ["<item 1 com ícone sugerido>", "<item 2>"],
        "cta_texto": "<texto do botão CTA>",
        "cta_cor": "<hex color do botão — ex: #FF4500>",
        "cta_tamanho": "<grande: padding 18px 48px | medio: 14px 32px | pequeno: 10px 24px>"
      }
    }
  ],
  "design": {
    "paleta": [
      {"nome": "Primária (CTA)", "hex": "#...", "uso": "Botões, CTAs, destaques"},
      {"nome": "Secundária", "hex": "#...", "uso": "Títulos, ícones"},
      {"nome": "Fundo", "hex": "#...", "uso": "Background principal"},
      {"nome": "Fundo Alternativo", "hex": "#...", "uso": "Seções alternadas"},
      {"nome": "Texto", "hex": "#...", "uso": "Corpo e parágrafos"},
      {"nome": "Urgência/Alerta", "hex": "#...", "uso": "Timers, badges de escassez"}
    ],
    "fonte_headline": "<nome da fonte: ex: Inter Bold | Montserrat Black | Playfair Display>",
    "fonte_corpo": "<nome da fonte: ex: Inter Regular | Roboto>",
    "hierarquia_tipografica": "<H1: 52-64px | H2: 36-42px | H3: 24-28px | body: 16-18px | small: 14px>",
    "estilo_visual": "<ex: minimalista com contraste alto | dark mode premium | colorido e energético | clean e profissional>",
    "estilo_botao": "<ex: arredondado com sombra | bordas retas e flat | com ícone de seta | pill shape>",
    "estilo_imagens": "<ex: mockup realista | screenshot do produto | pessoa usando o produto | ilustração flat>"
  },
  "mobile": {
    "mudancas": "<o que muda no mobile vs desktop: ex: hero em coluna única, imagem vai para baixo do texto>",
    "ordem_secoes": "<se alguma seção muda de posição no mobile>",
    "ajustes": "<tamanhos, espaçamentos e fontes específicos do mobile: H1: 32px, padding 24px, CTA full-width>"
  },
  "notas_conversao": "<recomendações estratégicas de conversão: ex: adicionar timer de urgência no hero, CTA sticky no mobile, popup de saída>"
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { landingData } = req.body as { landingData: string }
  if (!landingData) return res.status(400).json({ error: 'Missing landingData' })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Gere a landing page completa e executável — wireframe por blocos, copy posicionada, direção de design e versão mobile:

${landingData}

IMPORTANTE: use os dados reais do produto. Gere copy pronta para colocar na página. Layout preciso o suficiente para um designer criar sem perguntar nada.
Retorne APENAS o JSON válido conforme o schema.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') return res.status(500).json({ error: 'Unexpected response type' })

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(422).json({ error: 'Could not parse AI response as JSON' })

    const structure = JSON.parse(jsonMatch[0])
    return res.status(200).json({ structure })
  } catch (err) {
    console.error('Landing page API error:', err)
    return res.status(500).json({ error: 'Failed to generate landing page. Please try again.' })
  }
}
