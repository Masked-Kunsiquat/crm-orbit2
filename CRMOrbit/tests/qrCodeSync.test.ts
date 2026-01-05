import assert from "node:assert/strict";

import QRCode from "qrcode";

const mockCreateSyncBundle = jest.fn();
const mockParseSyncBundle = jest.fn();

jest.mock("@domains/sync/automergeSync", () => ({
  __esModule: true,
  createSyncBundle: (...args: unknown[]) => mockCreateSyncBundle(...args),
  parseSyncBundle: (...args: unknown[]) => mockParseSyncBundle(...args),
}));

jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn(async (payload: string) =>
      Promise.resolve(`data:image/png;base64,${payload}`),
    ),
  },
}));

import {
  assembleSyncChunks,
  generateSyncQRCode,
  parseSyncQRCode,
  type SyncQRCodeChunk,
} from "@domains/sync/qrCodeSync";

const QR_PREFIX = "crmorbit-sync|1|";

beforeEach(() => {
  mockCreateSyncBundle.mockReset();
  mockParseSyncBundle.mockReset();
  (QRCode.toDataURL as jest.Mock).mockClear();
});

test("generateSyncQRCode returns a single QR for small bundles", async () => {
  mockCreateSyncBundle.mockResolvedValue("hello");

  const batch = await generateSyncQRCode({} as never, "peer-1");

  assert.equal(batch.kind, "single");
  assert.equal(batch.chunks.length, 1);
  assert.ok(batch.chunks[0]?.dataUrl.includes("hello"));
  assert.equal((QRCode.toDataURL as jest.Mock).mock.calls.length, 1);
});

test("generateSyncQRCode chunks large bundles", async () => {
  mockCreateSyncBundle.mockResolvedValue("x".repeat(10000));

  const batch = await generateSyncQRCode({} as never, "peer-2");

  assert.equal(batch.kind, "chunked");
  assert.ok(batch.chunks.length > 1);
  for (const chunk of batch.chunks) {
    assert.ok(chunk.dataUrl.includes(QR_PREFIX));
  }
  assert.equal(
    (QRCode.toDataURL as jest.Mock).mock.calls.length,
    batch.chunks.length,
  );
});

test("parseSyncQRCode returns chunk metadata for chunked payloads", () => {
  const payload = `${QR_PREFIX}bundle-1|1|3|abc`;

  const result = parseSyncQRCode(payload);

  assert.equal(result.kind, "chunk");
  assert.equal(result.chunk.bundleId, "bundle-1");
  assert.equal(result.chunk.index, 1);
  assert.equal(result.chunk.total, 3);
  assert.equal(result.chunk.data, "abc");
});

test("assembleSyncChunks merges chunks and parses bundle", () => {
  const chunks: SyncQRCodeChunk[] = [
    { bundleId: "bundle-2", index: 2, total: 2, data: "def" },
    { bundleId: "bundle-2", index: 1, total: 2, data: "abc" },
  ];
  mockParseSyncBundle.mockReturnValue(new Uint8Array([1, 2, 3]));

  const changes = assembleSyncChunks(chunks);

  assert.deepEqual(changes, new Uint8Array([1, 2, 3]));
  assert.equal(mockParseSyncBundle.mock.calls[0]?.[0], "abcdef");
});

test("assembleSyncChunks rejects incomplete bundles", () => {
  const chunks: SyncQRCodeChunk[] = [
    { bundleId: "bundle-3", index: 1, total: 2, data: "abc" },
  ];

  assert.throws(() => assembleSyncChunks(chunks));
});
