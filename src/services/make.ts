export async function sendToMake(
  webhookUrl: string,
  instagramUrl: string
) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instagramUrl })
  });

  if (!res.ok) throw new Error("Make webhook failed");

  return res.json();
}
