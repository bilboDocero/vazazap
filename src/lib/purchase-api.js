export async function confirmPurchase(type, payload) {
  const response = await fetch(`/api/${type}/purchase`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: payload.id, payment_id: payload.payment_id, purchase_token: payload.purchase_token }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok || data.purchase?.payment_status !== 'approved') {
    throw new Error(data.error || 'Pagamento ainda não confirmado.');
  }
  return data.purchase;
}
