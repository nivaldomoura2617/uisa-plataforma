# Motor de Viabilidade Econômica — Regras de Negócio e Cálculo

## Índice
- [Visão Geral do App](#visão-geral-do-app)
- [Fluxo de Criação de Estudo](#fluxo-de-criação-de-estudo)
- [Permissões por Perfil](#permissões-por-perfil)
- [Estrutura do Wizard (6 Steps)](#estrutura-do-wizard-6-steps)
- [Motor de Cálculo Financeiro](#motor-de-cálculo-financeiro)
- [Indicadores Calculados](#indicadores-calculados)
- [Premissas Centralizadas](#premissas-centralizadas)
- [Versionamento de Projetos](#versionamento-de-projetos)

---

## Visão Geral do App

O **Motor de Viabilidade Econômica** é o primeiro aplicativo da plataforma UISA. Permite modelar, calcular e comparar a viabilidade financeira de projetos industriais (usinas, ampliações, novos produtos).

**Rota base:** `/viabilidade`
**Slug:** `viabilidade-economica`
**Engine:** v6

---

## Fluxo de Criação de Estudo

```
Analista/Moderador acessa /viabilidade/novo
    ↓
Wizard de 6 steps:
  [1] Configurações → nome, período, parâmetros financeiros
  [2] CAPEX → investimento total + data
  [3] Receitas → produtos, volumes, preços, ramp-up
  [4] Custos/OPEX → despesas operacionais, matéria-prima
  [5] RH/Folha → headcount, salários, encargos
  [6] Revisão → resumo antes de salvar
    ↓
ANALISTA         → botão "💾 Salvar Estudo" (DRAFT, sem cálculo)
MODERADOR/ADMIN  → botão "⚡ Calcular Viabilidade" (CALCULATED, com resultados)
    ↓
API POST /api/projects
  → verifica CALCULATE_PROJECT permission
  → se permitido: executa calcularFluxo() e salva results
  → se negado: salva apenas os inputs como DRAFT
```

---

## Permissões por Perfil

| Perfil | Criar/Editar | Calcular | Ver todos | Configurar premissas |
|--------|:---:|:---:|:---:|:---:|
| VISUALIZADOR | ❌ | ❌ | ❌ | ❌ |
| ANALISTA | ✅ (próprios) | ❌ | ❌ | ❌ |
| MODERADOR | ✅ (todos) | ✅ | ✅ | ✅ |
| ADMIN_APP | ✅ (todos) | ✅ | ✅ | ✅ |

> **Regra de Negócio:** O Analista preenche os dados e salva o estudo. O Moderador revisa e executa a análise financeira. Isso garante que estudos sejam validados antes de gerar indicadores.

---

## Estrutura do Wizard (6 Steps)

### Step 1 — Configurações (`StepConfig`)
- Nome do projeto
- Departamento / Responsável
- TMA (Taxa Mínima de Atratividade) — padrão: premissa global
- IR + CSLL (%) — padrão: premissa global
- Vida útil do projeto (anos)
- Ano de início do IRPJ
- Aplicar IRPJ após o ano configurado
- PIS/COFINS (%) — apenas Moderadores podem alterar premissas

### Step 2 — CAPEX (`StepCapex`)
- Valor total do investimento (R$)
- Data do investimento
- Vida fiscal para depreciação (anos)
- Manutenção anual (% do CAPEX)
- Crédito de PIS/COFINS sobre CAPEX

### Step 3 — Receitas (`StepReceita`)
- Produtos e volumes anuais
- Preços e margens (puxados das premissas ou editáveis por Moderador)
- Tipo de ramp-up: Integral / Gradual / Personalizado
- Ramp-up personalizado por ano (% da capacidade plena)

### Step 4 — Custos/OPEX (`StepOpex`)
- Itens de custo com: nome, valor anual, tipo (fixo/variável/percentual), índice de correção
- Suporte a múltiplos itens

### Step 5 — RH/Folha (`StepRH`)
- Cargos com quantidade, salário base e percentual de encargos
- Cálculo de custo total mensal e anual automaticamente

### Step 6 — Revisão (`StepRevisao`)
- Resumo de todos os inputs
- Acesso às premissas usadas
- Botão de calcular (Moderador) ou salvar rascunho (Analista)

---

## Motor de Cálculo Financeiro

**Arquivo:** `lib/calculations.ts`
**Função principal:** `calcularFluxo(inputs: ProjectInputs): CalculationResults`

### Sequência de Cálculo

```
1. Construir cronograma de ramp-up por ano
2. Calcular receita bruta anual (volume × preço × ramp-up%)
3. Calcular deduções (PIS/COFINS, outras)
4. Calcular receita líquida
5. Calcular OPEX total anual
6. Calcular folha + encargos anuais
7. Calcular EBITDA = Receita Líquida - OPEX - RH
8. Calcular depreciação anual (linha reta sobre CAPEX / vida fiscal)
9. Calcular EBIT = EBITDA - Depreciação
10. Calcular IRPJ/CSLL (após ano configurado)
11. Calcular NOPAT = EBIT - Impostos
12. Calcular FCL = NOPAT + Depreciação (non-cash add-back)
13. Construir fluxo de caixa: [-CAPEX, FCL_ano1, FCL_ano2, ...]
14. Calcular VPL (desconto ao TMA)
15. Calcular TIR (Newton-Raphson)
16. Calcular Payback simples e descontado
17. Calcular ROIC e margem EBITDA médios
```

### Tipos de Ramp-up

| Tipo | Descrição |
|------|-----------|
| `integral` | 100% da capacidade desde o primeiro ano |
| `gradual` | Crescimento linear de 0% até 100% ao longo dos anos configurados |
| `custom` | Array manual de percentuais por ano (ex: [60, 80, 90, 95, 100]) |

---

## Indicadores Calculados

| Indicador | Fórmula / Método |
|-----------|-----------------|
| **VPL** | Soma do FCL descontado ao TMA — CAPEX inicial |
| **TIR** | Taxa que anula o VPL (Newton-Raphson, máx. 100 iterações) |
| **Payback Simples** | Ano em que o acumulado de FCL ≥ CAPEX |
| **Payback Descontado** | Ano em que o acumulado de FCL descontado ≥ CAPEX |
| **EBITDA Médio** | Média do EBITDA ao longo da vida útil |
| **Margem EBITDA** | EBITDA / Receita Líquida × 100 |
| **ROIC** | NOPAT / CAPEX × 100 (ano 1) |

### Interpretação do VPL

| Resultado | Conclusão |
|-----------|-----------|
| VPL > 0 | Projeto VIÁVEL — gera valor acima do custo de capital |
| VPL = 0 | Neutro — exatamente cobre o custo de capital |
| VPL < 0 | Projeto INVIÁVEL — destrói valor |

---

## Premissas Centralizadas

**Tabela:** `PremissaConfig` + `ProductConfig`

Configuráveis em `/viabilidade/configuracoes` (apenas Moderador/Admin).

### Premissas Financeiras (`PremissaConfig`)

| Chave | Valor Padrão | Unidade |
|-------|-------------|---------|
| `TMA_PADRAO` | 14.7 | % a.a. |
| `IRPJ_CSLL` | 15.3 | % |
| `ANO_IRPJ` | 2034 | ano |
| `PIS_COFINS` | 9.15 | % |
| `VIDA_UTIL` | 10 | anos |
| `VIDA_FISCAL` | 5 | anos |

### Produtos Padrão (`ProductConfig`)

| Produto | Unidade |
|---------|---------|
| Açúcar VHP | ton |
| Etanol Hidratado | m³ |
| Etanol Anidro | m³ |
| Energia Elétrica | MWh |

> Preços e margens dos produtos são configuráveis pelo Moderador. O Analista usa os valores da premissa (somente leitura).

---

## Versionamento de Projetos

Cada vez que um projeto é editado e salvo, uma nova `ProjectVersion` é criada (incremento inteiro). A versão mais recente é sempre usada como dado atual.

```
Project (id: abc123)
  ├── ProjectVersion v1 (DRAFT — Analista)
  ├── ProjectVersion v2 (CALCULATED — Moderador calculou)
  └── ProjectVersion v3 (CALCULATED — Moderador ajustou premissa)
```

**Benefícios:**
- Histórico completo de todas as iterações
- Possibilidade futura de comparar versões side-by-side
- Auditoria: cada versão registra `createdBy`

> O campo `Project.status` reflete sempre o status da versão mais recente.
