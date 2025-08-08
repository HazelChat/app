# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `bun dev` - Start all applications in development mode (backend, web, mobile) using Turborepo
- `bun build` - Build and typecheck all apps and packages  
- `bun test` - Run all tests across the monorepo in watch mode
- `bun test:once` - Run tests once without watch mode
- `bun test:coverage` - Generate test coverage reports with text output
- `bun format:fix` - Format and fix code issues with Biome (required before commits)
- `biome check` - Check code without making changes
- `bun typecheck` - Run TypeScript type checking across all apps

### Application-Specific Commands
- `cd apps/web && bun dev` - Start web app only (port 3000)
- `cd apps/backend && bun dev` - Start Convex backend only
- `cd apps/backend && bun setup` - Setup Convex backend (run once)
- `cd apps/mobile && bun start` - Start Expo mobile app
- `cd apps/backend && bun convex:deploy` - Deploy Convex backend to production (never do this)

### Testing Commands
- `bun test:once` - Run tests once without watch mode
- `bun test:debug` - Run tests with debugger support (--inspect-brk)
- `bun test path/to/file.test.ts` - Run specific test file
- `cd apps/backend && bun test` - Run backend tests only
- Backend tests use `convex-test` with edge-runtime environment

## Architecture Overview

### Monorepo Structure
**Maki Chat** is a Discord-like chat application with three main applications sharing a Convex backend:

- **Backend** (`apps/backend/`): Convex serverless functions with Effect.js integration
- **Web** (`apps/web/`): React app with TanStack Router, react-aria-components, and TailwindCSS v4
- **Mobile** (`apps/mobile/`): React Native/Expo app with shared backend

### Tech Stack
- **Package Manager**: Bun v1.2.19 with workspaces
- **Build System**: Turborepo for coordinated builds
- **Backend**: Convex with TypeScript, Effect.js, and Confect schema
- **Authentication**: WorkOS AuthKit (web) and Clerk (mobile)
- **Web Frontend**: React 19, TanStack Router/Query, react-aria-components, TailwindCSS v4
- **Mobile**: React Native/Expo, Clerk auth, shared Convex backend
- **Code Quality**: Biome for linting/formatting (tab indentation, double quotes)
- **Testing**: Vitest with edge-runtime for backend, DOM testing for frontend

### Database Schema
Core entities managed by Convex (using Confect with Effect.js):
- **Organizations**: WorkOS-backed organizations with settings and members
- **Channels**: Public, private, thread, direct, and single message channels
- **Users**: Organization-specific profiles with roles and status
- **Messages**: With attachments, reactions, replies, and threading support
- **ChannelMembers**: User preferences per channel (muted, hidden, favorite)
- **Notifications**: Push notification settings and preferences
- **Presence**: Real-time user presence using @convex-dev/presence

### Key Patterns

#### Authentication & Authorization
- WorkOS integration for organization management in web app
- Clerk integration for mobile authentication
- Middleware pattern injects authenticated user context into all queries/mutations
- Active Record pattern for user operations (see `lib/activeRecords/`)

#### Backend Patterns
- **Middleware Functions**: `userQuery` and `userMutation` wrap Convex functions with auth
- **Custom Functions**: Extended Convex functions with Effect.js error handling
- **Confect Schema**: Type-safe schema definitions with Effect.js validation
- **Component Architecture**: Push notifications and presence as Convex components

#### Frontend Patterns
- **File-based Routing**: TanStack Router for web, Expo Router for mobile
- **Real-time Data**: Convex subscriptions with TanStack Query integration
- **Component Library**: react-aria-components for accessible UI
- **Styling**: TailwindCSS v4 with custom theme system

## Development Notes

### Backend Development
- Functions in `apps/backend/convex/` are deployed as Convex serverless functions
- Use middleware pattern: wrap functions with `userQuery`/`userMutation` for auth
- Schema defined using Confect with Effect.js - provides type-safe validation
- Tests use `convex-test` helper functions in `test/utils/data-generator.ts`
- All backend tests must run in edge-runtime environment

#### Common Backend Patterns
```typescript
// Use middleware for authenticated endpoints
export const myFunction = userMutation({
  args: { /* additional args */ },
  handler: async (ctx, args) => {
    // ctx.user is automatically available
    const { user } = ctx;
    // Your logic here
  }
});
```

### Frontend Development  
- Web app uses React 19 with TanStack Router for file-based routing
- Components use react-aria-components for accessibility
- Styling with TailwindCSS v4 - use `bun dev` to see live style updates
- Real-time updates via Convex subscriptions wrapped with TanStack Query
- Mobile app shares same backend APIs with React Native UI

#### Frontend Architecture
- Routes defined in `src/routes/` directory structure
- Global providers in `src/routes/__root.tsx`
- WorkOS AuthKit provider wraps the app for authentication
- Theme provider manages light/dark mode
- Convex provider with AuthKit integration in `components/convex-provider-with-authkit.tsx`

### Testing Strategy
- **Backend Tests**: Integration tests with realistic data scenarios
  - Use `randomIdentity()` to create test users with proper auth
  - Test files follow `*.spec.ts` or `*.test.ts` pattern
  - Focus on testing middleware, permissions, and data flows
- **Frontend Tests**: Component and integration tests with Vitest
- **Coverage**: Run `bun test:coverage` to ensure >80% coverage

### Code Style & Formatting
- Biome enforces consistent code style:
  - Tab indentation (4 spaces width)
  - Double quotes for strings
  - Trailing commas in multi-line expressions
  - Arrow functions preferred over function declarations
- Run `biome check` to see issues without fixing
- Run `bun format:fix` to auto-fix formatting

### Common Development Workflows

#### Adding a New Backend Function
1. Create function in appropriate file (channels.ts, messages.ts, etc.)
2. Use `userQuery` or `userMutation` wrapper for authenticated endpoints
3. Define args using Convex values (v.id(), v.string(), etc.)
4. Write integration tests covering success and error cases

#### Working with Organizations
- Organizations are created via WorkOS and synced to Convex
- Users can belong to multiple organizations
- All queries/mutations require `organizationId` parameter
- Organization context is injected via middleware

#### Working with Real-time Features
- Presence managed via `@convex-dev/presence` component
- Typing indicators use dedicated Convex functions
- Push notifications through `@convex-dev/expo-push-notifications`
- WebSocket subscriptions handle live updates automatically

#### Debugging Tips
- Backend logs appear in the Convex dashboard
- Use `console.log` in backend functions for debugging
- Frontend React DevTools and TanStack DevTools available
- Check Network tab for Convex WebSocket connections

## Important Implementation Notes

### File Organization
- **Backend**: All Convex functions in `apps/backend/convex/`
- **Web UI**: React components in `apps/web/src/`
- **Mobile**: React Native components in `apps/mobile/app/`
- **Shared Types**: Exported from backend via package exports

### Error Handling
- Backend uses Effect.js for type-safe error handling
- Custom functions wrap standard Convex functions with Effect patterns
- Frontend errors displayed via toast notifications (Sonner library)

### Performance Considerations
- Use React 19 compiler optimizations (babel-plugin-react-compiler)
- Implement virtualization for long lists
- Leverage TanStack Query caching for Convex subscriptions
- Code splitting handled by Vite bundler