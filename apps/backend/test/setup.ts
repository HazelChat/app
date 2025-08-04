// Test setup file that creates a modules object for convex-test
// This avoids the import.meta.glob issue in test environment

export const modules = {
	"../convex/channels.ts": () => import("../convex/channels"),
	"../convex/messages.ts": () => import("../convex/messages"),
	"../convex/organizations.ts": () => import("../convex/organizations"),
	"../convex/users.ts": () => import("../convex/users"),
	"../convex/me.ts": () => import("../convex/me"),
	"../convex/pinnedMessages.ts": () => import("../convex/pinnedMessages"),
	"../convex/notifications.ts": () => import("../convex/notifications"),
	"../convex/presence.ts": () => import("../convex/presence"),
	"../convex/typingIndicator.ts": () => import("../convex/typingIndicator"),
	"../convex/social.ts": () => import("../convex/social"),
	"../convex/invitations.ts": () => import("../convex/invitations"),
	"../convex/expo.ts": () => import("../convex/expo"),
	"../convex/workos.ts": () => import("../convex/workos"),
	"../convex/workosActions.ts": () => import("../convex/workosActions"),
	"../convex/crons.ts": () => import("../convex/crons"),
	"../convex/http.ts": () => import("../convex/http"),
	// Add a path with _generated to satisfy convex-test
	"../convex/_generated/api.js": () => Promise.resolve({}),
}