#!/usr/bin/env bun
/**
 * Test script for WorkOS webhook endpoint
 *
 * Usage:
 * 1. Update WEBHOOK_SECRET to match your .env file
 * 2. Run: bun run scripts/test-webhook.ts
 */

import * as crypto from "node:crypto"

// Configuration
const WEBHOOK_URL = "http://localhost:3003/webhooks/workos"
const WEBHOOK_SECRET = "your_webhook_secret_here" // Must match WORKOS_WEBHOOK_SECRET in .env

// Sample WorkOS webhook payload
const samplePayload = {
	id: "evt_test_123456",
	event: "user.created",
	created_at: new Date().toISOString(),
	data: {
		id: "user_test_123456",
		email: "test@example.com",
		firstName: "Test",
		lastName: "User",
		profilePictureUrl: null,
		emailVerified: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
}

/**
 * Generate WorkOS webhook signature
 */
function generateSignature(secret: string, payload: string): { header: string; timestamp: number } {
	const timestamp = Math.floor(Date.now() / 1000)
	const signedPayload = `${timestamp}.${payload}`
	const hmac = crypto.createHmac("sha256", secret)
	hmac.update(signedPayload)
	const signature = hmac.digest("hex")

	return {
		header: `t=${timestamp}, sig=${signature}`,
		timestamp,
	}
}

/**
 * Send test webhook request
 */
async function sendTestWebhook() {
	const payloadString = JSON.stringify(samplePayload)
	const { header } = generateSignature(WEBHOOK_SECRET, payloadString)

	console.log("📤 Sending test webhook to:", WEBHOOK_URL)
	console.log("📦 Payload:", JSON.stringify(samplePayload, null, 2))
	console.log("🔑 Signature header:", header)

	try {
		const response = await fetch(WEBHOOK_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"workos-signature": header,
			},
			body: payloadString,
		})

		const responseText = await response.text()
		let responseData: unknown
		try {
			responseData = JSON.parse(responseText)
		} catch {
			responseData = responseText
		}

		console.log("\n📥 Response:")
		console.log("  Status:", response.status, response.statusText)
		console.log("  Body:", responseData)

		if (response.ok) {
			console.log("\n✅ Webhook test successful!")
		} else {
			console.error("\n❌ Webhook test failed!")
		}
	} catch (error) {
		console.error("\n❌ Error sending webhook:", error)
		console.error("\n💡 Make sure the backend is running on port 3003")
	}
}

/**
 * Test invalid signature
 */
async function testInvalidSignature() {
	console.log("\n\n🧪 Testing invalid signature...")

	const payloadString = JSON.stringify(samplePayload)
	const invalidSignature = "t=1234567890, sig=invalid_signature_here"

	try {
		const response = await fetch(WEBHOOK_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"workos-signature": invalidSignature,
			},
			body: payloadString,
		})

		const responseText = await response.text()
		console.log("📥 Response:")
		console.log("  Status:", response.status, response.statusText)
		console.log("  Body:", responseText)

		if (response.status === 401) {
			console.log("✅ Invalid signature correctly rejected!")
		} else {
			console.error("❌ Expected 401 status for invalid signature")
		}
	} catch (error) {
		console.error("❌ Error:", error)
	}
}

/**
 * Test missing signature header
 */
async function testMissingSignature() {
	console.log("\n\n🧪 Testing missing signature header...")

	const payloadString = JSON.stringify(samplePayload)

	try {
		const response = await fetch(WEBHOOK_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: payloadString,
		})

		const responseText = await response.text()
		console.log("📥 Response:")
		console.log("  Status:", response.status, response.statusText)
		console.log("  Body:", responseText)

		if (response.status === 401) {
			console.log("✅ Missing signature correctly rejected!")
		} else {
			console.error("❌ Expected 401 status for missing signature")
		}
	} catch (error) {
		console.error("❌ Error:", error)
	}
}

// Run all tests
async function runTests() {
	console.log("🚀 Starting WorkOS webhook tests...\n")

	// Test valid webhook
	await sendTestWebhook()

	// Test invalid signature
	await testInvalidSignature()

	// Test missing signature
	await testMissingSignature()

	console.log("\n\n✨ All tests completed!")
}

runTests()
