import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { RoomNetwork } from "../src/game/network.js";
// This transport tests the room protocol; it does not replace a two-device WebRTC test.
class FakeConnection extends EventEmitter {
  constructor(peer, metadata) {
    super();
    this.peer = peer;
    this.metadata = metadata;
    this.open = false;
    this.dataChannel = { bufferedAmount: 0 };
  }
  send(data) {
    if (this.open)
      queueMicrotask(() => {
        if (this.other.open) this.other.emit("data", structuredClone(data));
      });
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.emit("close");
    if (this.other.open) {
      this.other.open = false;
      this.other.emit("close");
    }
  }
}
class FakePeer extends EventEmitter {
  static peers = new Map();
  static serial = 0;
  constructor(id) {
    super();
    this.id = id || "guest-" + ++FakePeer.serial;
    FakePeer.peers.set(this.id, this);
    queueMicrotask(() => this.emit("open", this.id));
  }
  connect(id, options) {
    const a = new FakeConnection(id),
      b = new FakeConnection(this.id, options.metadata);
    a.other = b;
    b.other = a;
    queueMicrotask(() => {
      const host = FakePeer.peers.get(id);
      if (!host) {
        this.emit("error", { type: "peer-unavailable" });
        return;
      }
      host.emit("connection", b);
      a.open = b.open = true;
      a.emit("open");
      b.emit("open");
    });
    return a;
  }
  destroy() {
    FakePeer.peers.delete(this.id);
  }
}
const pause = () => new Promise((r) => setTimeout(r, 15));
const profile = { name: "Operator", weapon: "m4", skin: "toxic" };
const make = () => {
  const r = { updates: [], errors: [], events: [] };
  r.net = new RoomNetwork(
    (d) => r.updates.push(d),
    (e) => r.errors.push(e),
    FakePeer,
  );
  r.net.subscribe((e) => r.events.push(e));
  return r;
};
test("Room creation, code join, balanced teams, start and authoritative input routing", async () => {
  const host = make(),
    one = make(),
    two = make();
  try {
    host.net.open(profile, null, { size: 2, map: "dust", duration: 180 });
    await pause();
    assert.match(host.net.code, /^[A-Z2-9]{6}$/);
    one.net.open({ ...profile, name: "Friend 1" }, host.net.code);
    await pause();
    two.net.open({ ...profile, name: "Friend 2" }, host.net.code);
    await pause();
    assert.equal(host.net.members.length, 3);
    assert.equal(one.net.members.length, 3);
    assert.deepEqual(
      host.net.members.map((m) => m.team),
      [0, 1, 0],
    );
    assert.equal(one.updates.at(-1).myId, one.net.id);
    host.net.start();
    await pause();
    assert.equal(one.events.at(-1).type, "start");
    assert.equal(one.net.started, true);
    one.net.hostConnection.send({
      type: "input",
      id: host.net.id,
      input: { fire: true, mz: 1 },
    });
    await pause();
    const input = host.events.find((e) => e.type === "input");
    assert.equal(input.id, one.net.id);
    assert.equal(input.input.fire, true);
    host.net.broadcast({ type: "state", state: { score: [2, 1], time: 3 } });
    await pause();
    assert.deepEqual(one.events.at(-1).state.score, [2, 1]);
    one.net.close();
    await pause();
    assert.equal(host.net.members.length, 2);
    assert.ok(host.events.some((e) => e.type === "leave"));
  } finally {
    host.net.close();
    one.net.close();
    two.net.close();
  }
});
test("Full rooms and started matches reject new peers and report errors", async () => {
  const host = make(),
    one = make(),
    overflow = make(),
    late = make();
  try {
    host.net.open(profile, null, { size: 1, map: "dust", duration: 180 });
    await pause();
    one.net.open(profile, host.net.code);
    await pause();
    overflow.net.open(profile, host.net.code);
    await pause();
    assert.ok(overflow.errors.some((e) => e.includes("to‘lgan")));
    assert.equal(host.net.members.length, 2);
    host.net.start();
    late.net.open(profile, host.net.code);
    await pause();
    assert.ok(late.errors.some((e) => e.includes("boshlangan")));
  } finally {
    [host, one, overflow, late].forEach((r) => r.net.close());
  }
});
test("Unknown room codes and host departure produce explicit connection errors", async () => {
  const missing = make(),
    host = make(),
    guest = make();
  try {
    missing.net.open(profile, "ZZZZZZ");
    await pause();
    assert.ok(missing.errors.some((e) => e.includes("topilmadi")));
    host.net.open(profile, null, { size: 2, map: "dust", duration: 180 });
    await pause();
    guest.net.open(profile, host.net.code);
    await pause();
    host.net.close();
    await pause();
    assert.ok(guest.errors.some((e) => e.includes("Xona egasi")));
    assert.equal(guest.net.closed, true);
  } finally {
    [missing, host, guest].forEach((r) => r.net.close());
  }
});
