import { Config, Data, Effect, Option, Redacted } from "effect"

export interface EncryptedToken {
	ciphertext: string // Base64 encoded
	iv: string // Base64 encoded (12 bytes for AES-GCM)
	keyVersion: number
}

export class IntegrationEncryptionError extends Data.TaggedError("IntegrationEncryptionError")<{
	readonly cause: unknown
	readonly operation: "encrypt" | "decrypt" | "importKey"
}> {}

export class KeyVersionNotFoundError extends Data.TaggedError("KeyVersionNotFoundError")<{
	readonly keyVersion: number
}> {}

export class IntegrationEncryption extends Effect.Service<IntegrationEncryption>()("IntegrationEncryption", {
	accessors: true,
	effect: Effect.gen(function* () {
		// Load encryption keys from config (support key rotation)
		const currentKey = yield* Config.redacted("INTEGRATION_ENCRYPTION_KEY")
		const currentKeyVersion = yield* Config.number("INTEGRATION_ENCRYPTION_KEY_VERSION").pipe(
			Config.withDefault(1),
		)

		// Optional: Previous key for decryption during rotation
		const previousKey = yield* Config.redacted("INTEGRATION_ENCRYPTION_KEY_PREV").pipe(
			Config.option,
			Effect.map(Option.getOrUndefined),
		)
		const previousKeyVersion = yield* Config.number("INTEGRATION_ENCRYPTION_KEY_VERSION_PREV").pipe(
			Config.withDefault(0),
		)

		// Cache for imported crypto keys
		const keyCache = new Map<number, CryptoKey>()

		const importKey = (keyData: Redacted.Redacted<string>, version: number) =>
			Effect.gen(function* () {
				// Check cache first
				const cachedKey = keyCache.get(version)
				if (cachedKey) {
					return cachedKey
				}

				const rawKey = Buffer.from(Redacted.value(keyData), "base64")

				// Validate key length (256 bits = 32 bytes)
				if (rawKey.length !== 32) {
					return yield* Effect.fail(
						new IntegrationEncryptionError({
							cause: `Invalid key length: expected 32 bytes, got ${rawKey.length}`,
							operation: "importKey",
						}),
					)
				}

				const cryptoKey = yield* Effect.tryPromise({
					try: () =>
						crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM", length: 256 }, false, [
							"encrypt",
							"decrypt",
						]),
					catch: (cause) => new IntegrationEncryptionError({ cause, operation: "importKey" }),
				})

				// Cache the imported key
				keyCache.set(version, cryptoKey)
				return cryptoKey
			})

		const encrypt = Effect.fn("IntegrationEncryption.encrypt")(function* (plaintext: string) {
			const key = yield* importKey(currentKey, currentKeyVersion)

			// Generate random 12-byte IV for AES-GCM
			const iv = crypto.getRandomValues(new Uint8Array(12))
			const encoded = new TextEncoder().encode(plaintext)

			const ciphertext = yield* Effect.tryPromise({
				try: () =>
					crypto.subtle.encrypt(
						{
							name: "AES-GCM",
							iv,
							tagLength: 128,
						},
						key,
						encoded,
					),
				catch: (cause) => new IntegrationEncryptionError({ cause, operation: "encrypt" }),
			})

			return {
				ciphertext: Buffer.from(ciphertext).toString("base64"),
				iv: Buffer.from(iv).toString("base64"),
				keyVersion: currentKeyVersion,
			} satisfies EncryptedToken
		})

		const decrypt = Effect.fn("IntegrationEncryption.decrypt")(function* (encrypted: EncryptedToken) {
			// Select key based on version
			let keyData: Redacted.Redacted<string> | undefined
			if (encrypted.keyVersion === currentKeyVersion) {
				keyData = currentKey
			} else if (previousKey && encrypted.keyVersion === previousKeyVersion) {
				keyData = previousKey
			}

			if (!keyData) {
				return yield* Effect.fail(new KeyVersionNotFoundError({ keyVersion: encrypted.keyVersion }))
			}

			const key = yield* importKey(keyData, encrypted.keyVersion)
			const iv = Buffer.from(encrypted.iv, "base64")
			const ciphertext = Buffer.from(encrypted.ciphertext, "base64")

			const plaintext = yield* Effect.tryPromise({
				try: () =>
					crypto.subtle.decrypt(
						{
							name: "AES-GCM",
							iv,
							tagLength: 128,
						},
						key,
						ciphertext,
					),
				catch: (cause) => new IntegrationEncryptionError({ cause, operation: "decrypt" }),
			})

			return new TextDecoder().decode(plaintext)
		})

		return {
			encrypt,
			decrypt,
			currentKeyVersion,
		}
	}),
}) {}
