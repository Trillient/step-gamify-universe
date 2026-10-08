import { SignJWT, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";
import { firebaseVerifier } from "../server/auth";

const PROJECT = "wooly-test";

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const other = await generateKeyPair("RS256");
  const sign = (
    claims: Record<string, unknown>,
    opts: { iss?: string; aud?: string; exp?: string | number; key?: typeof privateKey; sub?: string; alg?: string } = {},
  ) => {
    const jwt = new SignJWT({ firebase: { sign_in_provider: "google.com" }, ...claims })
      .setProtectedHeader({ alg: (opts.alg ?? "RS256") as "RS256", kid: "k1" })
      .setIssuer(opts.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(opts.aud ?? PROJECT)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "1h");
    if (opts.sub !== "") jwt.setSubject(opts.sub ?? "user-1");
    return jwt.sign(opts.key ?? privateKey);
  };
  const verify = firebaseVerifier(PROJECT, publicKey);
  return { sign, verify, other };
}

describe("firebase token verification", () => {
  it("accepts a valid token and returns uid and name", async () => {
    const { sign, verify } = await setup();
    expect(await verify(await sign({ name: "Ann" }))).toEqual({ uid: "user-1", name: "Ann" });
  });

  it("defaults the name to empty when the token has none", async () => {
    const { sign, verify } = await setup();
    expect((await verify(await sign({}))).name).toBe("");
  });

  it("rejects a wrong issuer, wrong audience, expiry and a foreign signature", async () => {
    const { sign, verify, other } = await setup();
    await expect(verify(await sign({}, { iss: "https://securetoken.google.com/other" }))).rejects.toThrow();
    await expect(verify(await sign({}, { aud: "other" }))).rejects.toThrow();
    await expect(verify(await sign({}, { exp: Math.floor(Date.now() / 1000) - 120 }))).rejects.toThrow();
    await expect(verify(await sign({}, { key: other.privateKey }))).rejects.toThrow();
  });

  it("accepts Sign in with Apple tokens (required by App Store guideline 4.8)", async () => {
    const { sign, verify } = await setup();
    const user = await verify(await sign({ firebase: { sign_in_provider: "apple.com" } }));
    expect(user.uid).toBeTruthy();
  });

  it("accepts Firebase password-provider tokens", async () => {
    const { sign, verify } = await setup();
    const user = await verify(await sign({ email: "wooly_walker@steps.woolston.dev", firebase: { sign_in_provider: "password" } }));
    expect(user.uid).toBeTruthy();
  });

  it("rejects password-provider tokens outside the username namespace", async () => {
    const { sign, verify } = await setup();
    await expect(verify(await sign({ email: "someone@example.com", firebase: { sign_in_provider: "password" } }))).rejects.toThrow();
    await expect(verify(await sign({ email: "a@steps.woolston.dev", firebase: { sign_in_provider: "password" } }))).rejects.toThrow();
    await expect(verify(await sign({ firebase: { sign_in_provider: "password" } }))).rejects.toThrow();
  });

  it("rejects tokens from unsupported providers", async () => {
    const { sign, verify } = await setup();
    await expect(verify(await sign({ firebase: { sign_in_provider: "anonymous" } }))).rejects.toThrow();
    await expect(verify(await sign({ firebase: undefined }))).rejects.toThrow();
  });

  it("rejects a token without a subject and unsigned/garbage input", async () => {
    const { sign, verify } = await setup();
    await expect(verify(await sign({}, { sub: "" }))).rejects.toThrow();
    await expect(verify("garbage")).rejects.toThrow();
    const unsigned = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(
      JSON.stringify({ sub: "x", iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT }),
    ).toString("base64url")}.`;
    await expect(verify(unsigned)).rejects.toThrow();
  });
});
