# 🚀 UISA Plataforma — Guia de Início

## 1. Iniciar o servidor

Abra o terminal dentro da pasta do projeto e execute:

```bash
npm run dev
```

O servidor vai iniciar em: **http://localhost:3000**

---

## 2. Fazer login

1. Abra o browser em **http://localhost:3000**
2. Na tela de login, digite qualquer e-mail `@uisa.com.br`
   - Ex: `admin@uisa.com.br`
3. Clique em **"Enviar Magic Link"**
4. Volte ao terminal — um link aparecerá assim:

```
=============================================
🚀 MAGIC LINK PARA LOGIN LOCAL:
http://localhost:3000/api/auth/callback/email?...
=============================================
```

5. **Copie esse link** e abra no browser
6. Você estará logado automaticamente

---

## 3. Acessar o aplicativo

1. Após o login, você estará no **Portal UISA**
2. Clique em **"Abrir aplicativo"** no card de Viabilidade Econômica
3. Você será direcionado para `/viabilidade`

---

## 4. Funcionalidades disponíveis

| Funcionalidade | Caminho |
|---|---|
| Painel de projetos | `/viabilidade` |
| Criar novo estudo | `/viabilidade/novo` |
| Editar projeto | `/viabilidade/[id]/editar` |
| Ver resultados | `/viabilidade/[id]` |
| Premissas padrão | `/viabilidade/configuracoes` *(Moderador/Admin)* |

---

## 5. Checklist de testes (próxima sessão)

- [ ] Login funciona (magic link no terminal)
- [ ] Portal carrega com o app de Viabilidade
- [ ] Criar projeto novo (6 passos do wizard)
- [ ] Calcular e ver resultados (VPL, TIR, Payback, tabela)
- [ ] Editar projeto existente sem erro
- [ ] Excluir projeto (soft delete)

---

## ⚠️ Observações

- O banco de dados é **SQLite local** — arquivo em `prisma/dev.db`
- O e-mail **não é enviado de verdade** — o link aparece só no terminal
- O domínio permitido é `@uisa.com.br` (configurado no `.env`)
- Se a porta 3000 estiver ocupada, o servidor usa 3001 automaticamente
