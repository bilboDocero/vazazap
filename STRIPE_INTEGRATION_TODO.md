# Stripe Integration Status & Next Steps

## Status Atual da Integração
- **Capacidades Ativadas**: Cobranças com Cartão de Crédito, Apple Pay, Google Pay, Link e Pix habilitadas no Stripe Dashboard.
- **Padrão de UX Adotado**: **Ponto A (UX Híbrida)** — Pix instantâneo gerado e validado diretamente no modal (QR Code + Copia e Cola) e Carteiras Digitais (Apple Pay / Google Pay / Link / Cartão) via Stripe Checkout Session (`ui_mode: 'hosted_page'`).

## Values to Replace

The following values are configured dynamically in the application code.

**Files containing placeholders:**
- [server/stripe.js](server/stripe.js)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | payment | Set to "payment" for one-time charges or "subscription" for recurring billing. |
| success_url | Dynamic origin + `/#/status?payment=success&session_id={CHECKOUT_SESSION_ID}` | Actual post-payment success return page URL. Keep the `{CHECKOUT_SESSION_ID}` template. |
| cancel_url | Dynamic origin + `/#/status?payment=cancel` | Actual cancel/return page URL. |
| line_items[].price_data | Dynamic BRL price calculation (`amountCents`) | Dynamic in-code calculation in BRL or custom Stripe Price IDs from Dashboard. |

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [server/stripe.js](server/stripe.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection | { "enabled": false } |
| automatic_tax | { "enabled": false } |
| allow_promotion_codes | false |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

## Setup and Next Steps

### 1. Environment Variables & API Keys
Configure the following variables in your `.env` file:
```env
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... em desenvolvimento)
STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_... em desenvolvimento)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. How the Integration Works (Ponto A: UX Híbrida)
1. **Etapa 1 (Plano)**: Cliente escolhe Plano Normal ou Impulsionado e a quantidade de fotos/arquivos.
2. **Etapa 2 (Edição)**: Cliente faz o upload do avatar/logo, define nome, rede social, @usuário e fotos.
3. **Etapa 3 (Pagamento)**:
   - **Pix Instantâneo**: Gera o QR Code e código Copia e Cola direto no modal via `createStripePixPayment`. O sistema faz polling automático a cada 3s em `/api/payment/status`. Assim que pago no app do banco, avança para a Etapa 4 automaticamente.
   - **Apple Pay / Google Pay / Carteira Digital**: Cria a Checkout Session na Stripe e redireciona o cliente para autorização em 1-clique. Ao retornar, o sistema captura o `session_id`, valida a aprovação e abre a Etapa 4.
4. **Etapa 4 (Pré-visualização)**: Exibe a simulação realística do story/vitrine no celular com selo de pagamento confirmado e botão "Confirmar e Publicar".

### 3. Webhook da Stripe em Produção
Cadastre no [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks):
- **URL**: `https://seudominio.com/api/webhook/stripe`
- **Eventos escutados**: `payment_intent.succeeded` e `checkout.session.completed`
- Copie o **Segredo de assinatura** (`whsec_...`) para o seu arquivo `.env` como `STRIPE_WEBHOOK_SECRET`.

### 4. Resources
- Support: https://support.stripe.com
- Stripe Developer Documentation: https://docs.stripe.com/mcp
- Dynamic Payment Methods: https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods
