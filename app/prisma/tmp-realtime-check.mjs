import Ably from "ably";

const matchId = process.argv[2];
if (!matchId) {
  console.error("usage: node tmp-realtime-check.mjs <matchId>");
  process.exit(1);
}

const client = new Ably.Realtime({
  authCallback: async (_params, callback) => {
    try {
      const res = await fetch("https://amateur-lemon.vercel.app/api/realtime-token");
      const tokenRequest = await res.json();
      callback(null, tokenRequest);
    } catch (err) {
      callback(err, null);
    }
  },
});

client.connection.on("connected", () => console.log("CONNECTED to Ably"));
client.connection.on("failed", (err) => console.error("CONNECTION FAILED", err));

const channel = client.channels.get(`match:${matchId}`);
channel.subscribe((msg) => {
  console.log("RECEIVED EVENT:", msg.name, "at", new Date().toISOString());
});

console.log(`Listening on match:${matchId} for 25s...`);
await new Promise((r) => setTimeout(r, 25000));
console.log("Done listening.");
client.close();
