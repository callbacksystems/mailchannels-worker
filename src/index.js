export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

    const apiKey = request.headers.get("Authorization")?.split(" ")[1]
    if (apiKey !== env.API_KEY) return new Response("Unauthorized", { status: 401 })

    const email = await request.json()
    email.personalizations = email.personalizations.map((personalization) => {
      return {
        ...personalization,
        dkim_domain: env.DOMAIN,
        dkim_private_key: env.DKIM_PRIVATE_KEY,
        dkim_selector: "mailchannels"
      }
    })

    return await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email)
    })
  }
}
