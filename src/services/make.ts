export async function sendToMake(webhookUrl: string, instagramUrl: string) {
  let retries = 5;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramUrl,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) return await res.json();

      throw new Error(`Server responded with ${res.status}`);
    } catch (error) {
      retries--;
      if (retries === 0) throw error;

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}
