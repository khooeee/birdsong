/** Inworld's REST API and sideband sockets, faked on the globals VoiceCall uses. */
export function fakeInworld(t, { refuseAttach = () => false, respond = () => null } = {}) {
  const requests = [];
  const sockets = [];
  let calls = 0;
  const realFetch = globalThis.fetch;
  const RealWebSocket = globalThis.WebSocket;
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init.method, auth: init.headers.Authorization, body: init.body });
    const custom = respond(new URL(String(url)));
    if (custom) return custom;
    if (String(url).endsWith("/v1/realtime/ice-servers")) return Response.json({ ice_servers: [{ urls: "turn:inworld" }] });
    if (String(url).endsWith("/v1/realtime/calls")) {
      calls += 1;
      return new Response(`answer-${calls}`, { status: 201, headers: { Location: `/v1/realtime/calls/call-${calls}` } });
    }
    return new Response("", { status: 200 });
  };
  class FakeSocket {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    constructor(url, init) {
      this.url = url;
      this.auth = init.headers.Authorization;
      sockets.push(this);
      setImmediate(() => (refuseAttach(this) ? this.close() : this.open()));
    }
    open() {
      this.readyState = 1;
      this.onopen?.();
    }
    receive(event) {
      this.onmessage?.({ data: JSON.stringify(event) });
    }
    send(data) {
      this.sent.push(JSON.parse(data));
    }
    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.onclose?.({ code: 1006 });
    }
  }
  globalThis.WebSocket = FakeSocket;
  t.after(() => {
    globalThis.fetch = realFetch;
    globalThis.WebSocket = RealWebSocket;
  });
  return { requests, sockets };
}
