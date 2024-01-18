export async function sendWebhook(webhook: string, data: any, method = 'POST') {
  console.info('sendWebhook', webhook, data);
  const res = await fetch(webhook, {
    method,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`,
    },
  });

  if (!res.ok) {
    console.info(await res.text());
    throw new Error('Failed to send webhook')
  }
  console.info('sendWebhook done');
}
