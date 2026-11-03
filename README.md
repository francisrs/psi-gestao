# PsiGestao

Painel administrativo simples para **psicologos autonomos** organizarem **pacientes, sessoes e pagamentos**.

> Gestao administrativa basica. **Nao** e um prontuario clinico: nao registre anotacoes terapeuticas.

## Funcionalidades

- Cadastro e login com e-mail e senha (Supabase Auth), logout e rotas protegidas
- Dashboard: total de pacientes, sessoes de hoje, pagamentos pendentes, faltas no mes, proximas sessoes e pendencias recentes
- Pacientes: listar, buscar por nome, criar, editar e excluir
- Detalhe do paciente: dados, historico, total pago, total pendente, faltas e proxima sessao
- Sessoes: criar, editar, excluir e filtrar por paciente e status
- Financeiro: sessoes pendentes, total pendente, total pago e botao "Marcar como pago"
- **Politica de cancelamento** (veja a secao abaixo): cobranca de cancelamento tardio do paciente e remarcacao sem onus quando o psicologo cancela
- Layout responsivo (sidebar no desktop, menu em gaveta no mobile), estados de carregamento, vazio, erro e avisos de sucesso

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS) · lucide-react (icones)

## Estrutura

```
app/
  (auth)/login, (auth)/signup
  (dashboard)/dashboard, patients, patients/[id], sessions, financial
  layout.tsx, page.tsx, globals.css
components/   ui, layout, auth, patients, sessions, financial
lib/          env, auth (requireUser), utils
services/     patients, sessions, dashboard (queries Supabase)
supabase/     client.ts (navegador), server.ts (servidor), middleware.ts
types/        domain.ts, database.ts
sql/          schema.sql, policies.sql
middleware.ts
```

**Estrategia client/server:** paginas sao Server Components e leem dados via `services/*` com o cliente de servidor. Formularios, filtros, modais e botoes de acao sao Client Components e gravam com o cliente de navegador, seguidos de `router.refresh()`. Os servicos recebem o cliente Supabase como argumento, entao funcionam nos dois ambientes.

## Setup local

1. **Requisitos:** Node.js 18.18+ e uma conta no Supabase.
2. **Instale as dependencias:**
   ```bash
   npm install
   ```
3. **Crie o projeto no Supabase:** em https://supabase.com crie um novo projeto e aguarde a conclusao.
4. **Execute o SQL:** em *SQL Editor*, rode nesta ordem:
   1. `sql/schema.sql`
   2. `sql/policies.sql`

   Se voce **ja executou uma versao anterior** do `schema.sql`, rode apenas `sql/migration_001_cancellation.sql` (adiciona as colunas e constraints da politica de cancelamento).
5. **Configure o `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```
   Preencha com os valores de *Project Settings > API*:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   `NEXT_PUBLIC_APP_TIMEZONE` e opcional (padrao `America/Sao_Paulo`) e define o que e "hoje", "mes atual" e o fuso das horas de antecedencia.
   `NEXT_PUBLIC_LATE_CANCEL_HOURS` e opcional (padrao `12`) e define a antecedencia minima para cancelar sem cobranca.
6. **Rode:**
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000 e crie sua conta em `/signup`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run start` | Serve o build |
| `npm run typecheck` | Verifica tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint |

## Autenticacao

- Cadastro e login por e-mail e senha. O `middleware.ts` renova a sessao e redireciona: sem login vai para `/login`; logado em `/login` ou `/signup` vai para `/dashboard`.
- **Confirmacao de e-mail:** por padrao o Supabase exige confirmar o e-mail. Para testar rapido, desative em *Authentication > Providers > Email > Confirm email*. Em producao, mantenha ativado e configure a *Site URL* em *Authentication > URL Configuration*.
- **Profile:** o trigger `on_auth_user_created` (em `schema.sql`) cria o registro em `profiles` no signup, usando o nome enviado no cadastro. O app tambem faz um `upsert` de seguranca quando o signup ja retorna sessao.

## Row Level Security

RLS esta habilitado em `profiles`, `patients` e `sessions`. Cada usuario autenticado so le, cria, altera e exclui os proprios registros (`user_id = auth.uid()`; em `profiles`, `id = auth.uid()`). Ao criar ou editar uma sessao, a policy tambem exige que o paciente pertenca ao mesmo usuario. A chave `anon` pode ficar publica porque o acesso aos dados e limitado pelas policies. **Nunca** use a `service_role` no front-end.

## Politica de cancelamento

Ao definir o status de uma sessao como **Cancelada**, o formulario pede quem cancelou e quando o cancelamento foi comunicado.

| Quem cancelou | Regra | Resultado |
| --- | --- | --- |
| Paciente, com **menos de 12 h** de antecedencia (ou depois do horario) | Cancelamento tardio | Sessao **cobrada**: entra em "pendente" no financeiro com o valor informado |
| Paciente, com **12 h ou mais** | Cancelamento no prazo | **Sem cobranca** (valor zerado, fora do financeiro) |
| Psicologo | Sempre sem custo | **Sem cobranca**; pode ser **remarcada sem onus** |

- A antecedencia e calculada entre "Cancelado em" (data/hora, padrao: agora) e o horario da sessao, no fuso configurado. O limite de 12 h pode ser alterado em `NEXT_PUBLIC_LATE_CANCEL_HOURS`.
- Para cancelamentos do paciente a cobranca vem **sugerida automaticamente**, mas voce pode marcar ou desmarcar "Cobrar esta sessao" (por exemplo, para abrir uma excecao).
- Cancelamento pelo psicologo nunca cobra (garantido tambem por constraint no banco). Voce pode informar a nova data no proprio formulario ou depois, pelo botao de remarcar na lista de sessoes. A remarcacao cria uma nova sessao agendada com o valor normal do paciente e vincula a original, que fica marcada como "remarcada sem onus".
- A regra e aplicada pelo app no momento de salvar; o banco garante a consistencia dos campos (`cancelled_by`, `cancelled_at`, `cancellation_fee_applies`, `rescheduled_to_id`), mas nao recalcula o prazo sozinho.

## Regras financeiras

- Sessoes **canceladas** nao entram em "pendente", **exceto** cancelamentos tardios do paciente (veja acima).
- "Total pago" soma todas as sessoes com `payment_status = paid`.
- Os totais sao somados na aplicacao, o que e adequado para 20 a 60 pacientes. Para volumes maiores, mova para views ou funcoes SQL.

## Proximos passos

- Cobranca mensal automatica (gerar sessoes/cobrancas do mes)
- Paginacao e filtros por periodo nas sessoes
- Exportacao de relatorios (CSV)
- Recuperacao de senha e edicao de perfil
- Testes automatizados e tipos gerados com `supabase gen types`
# psigestao
