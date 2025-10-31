# Project TODOs

## High Priority Features


## Medium Priority Features

- Setup Organization should display better errors 
- Migrate the missing icons to nucleo

- webhooks for workos


### Core Features
- [ ] **Chat Improvements**
  - Better Chat Input with:
    - Enhanced code highlighting
    - User mentions
    - Slash commands

- [ ] **User Management**
  - Invite User mutation (`apps/web/src/components/application/modals/email-invite-modal.tsx:69`)
  - Fix webhook for invitation.created

### UI/UX Improvements
- [ ] Image Viewer component

## Frontend TODOs (apps/web)

- Update Icons

### Chat Components
- [ ] **Message Features**
  - Forward message functionality (not yet implemented)
  - Mark as unread functionality (not yet implemented)
  - Report message functionality (not yet implemented)
  - View message details functionality (not yet implemented)

- [ ] **Channel Features**
  - Implement call functionality (`apps/web/src/components/app-sidebar/channel-item.tsx:364`)

- [ ] **User Profile**
  - Implement calling functionality in profile popover (`apps/web/src/components/chat/user-profile-popover.tsx:88`)
  - Edit profile functionality (`apps/web/src/components/chat/user-profile-popover.tsx:205`)

- [ ] **Presence & Real-time**
  - Implement server-side offline detection (`apps/web/src/hooks/use-presence.ts:17`)

### Settings & Administration
- [ ] Implement resend invitation mutation (`apps/web/src/routes/_app/$orgSlug/settings/invitations.tsx:71`)
- [ ] Scope layout to organization (`apps/web/src/routes/_app/$orgSlug/layout.tsx:21`)


## Backend TODOs (apps/backendv2)

- API always returning 500's on errors for some reason

### Authentication & Authorization
- [ ] Create organization membership when user has organizationId (`apps/backend/src/routes/auth.http.ts:99`)
- [ ] Implement smarter role-based policies (`apps/backend/src/policies/channel-policy.ts:26,39,53`)
- [ ] User creation logic improvements (`apps/backend/src/services/auth.ts:74,144`)

### Organizations
- [ ] Return separate error for duplicate slug errors (`apps/backend/src/routes/organizations.http.ts:53`)



## Technical Debt

### Testing

## Notes
- Line numbers reference specific TODO comments in the codebase
- Some TODOs may require architectural decisions before implementation
- Priority should be given to features that affect user experience directly