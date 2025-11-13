# Project TODOs


# Before release
- Settings Pages (TEST TES TEST)
- Fix Theme colors not working
- Onboarding
- Electric proxy
- Notifications 
 - Display Badge with number in sidebar
 - Play sound when new message

- Migrate the missing icons to nucleo

- setup webhooks for workos
- connect app.hazel.sh to production



## High Priority Features
- Notifications

## Medium Priority Features




### Core Features
- [ ] **Chat Improvements**
  - Better Chat Input with:
    - Slash commands


- [ ] **User Management**
  - Fix webhook for invitation.created

### UI/UX Improvements


## Frontend TODOs (apps/web)

- Update Icons

### Chat Components
- [ ] **Message Features**
  - Forward message functionality (not yet implemented)
  - Mark as unread functionality (not yet implemented)
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


### Authentication & Authorization
- [ ] Implement smarter role-based policies (`apps/backend/src/policies/channel-policy.ts:26,39,53`)

### Organizations



## Technical Debt

### Testing

## Notes
- Line numbers reference specific TODO comments in the codebase
- Some TODOs may require architectural decisions before implementation
- Priority should be given to features that affect user experience directly