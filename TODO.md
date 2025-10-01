# Project TODOs

## High Priority Features

### Core Features
- [ ] **File Upload**
  - Display a preview of the file being uploaded with progress indicator
  - Stop user from sending message when upload is in progress
  - Show error if upload fails
  - Fix attachment links (`apps/web/src/components/chat/message-attachments.tsx:59,77,104`)

- [ ] **Real-time Features**
  - Presence system with Away status
  - Better presence state implementation (`apps/web/src/components/sidebar-favorite-group.tsx:34`)

- [ ] **Chat Improvements**
  - Better Chat Input with:
    - Enhanced code highlighting
    - User mentions
    - Slash commands
  - Implement message pagination (`apps/web/src/providers/chat-provider.tsx:104,111,262`)
  - Implement pinned message lookup (`apps/web/src/providers/chat-provider.tsx:180`)

- [ ] **User Management**
  - Invite User mutation (`apps/web/src/components/application/modals/email-invite-modal.tsx:69`)
  - Fix webhook for invitation.created

### UI/UX Improvements
- [ ] Image Viewer component
- [ ] Consolidate all icons to use one Icon Library
- [ ] Add member counts to channels (`apps/web/src/routes/_app/$orgId/chat/index.tsx:56,72,87`)

## Frontend TODOs (apps/web)

### Chat Components
- [ ] **Message Features**
  - Forward message functionality (`apps/web/src/components/chat/message-item.tsx:329`)
  - Mark as unread functionality (`apps/web/src/components/chat/message-item.tsx:333`)
  - Report message functionality (`apps/web/src/components/chat/message-item.tsx:344`)
  - View message details functionality (`apps/web/src/components/chat/message-item.tsx:348`)

- [ ] **Channel Features**
  - Implement call functionality (`apps/web/src/components/app-sidebar/channel-item.tsx:273`)
  - Add channel data to message list (`apps/web/src/components/chat/message-list.tsx:55`)
  - Fix chat header implementation (`apps/web/src/components/chat/chat-header.tsx:13`)

- [ ] **User Profile**
  - Implement calling functionality in profile popover (`apps/web/src/components/chat/user-profile-popover.tsx:84`)
  - Edit profile functionality (`apps/web/src/components/chat/user-profile-popover.tsx:188`)

### Settings & Administration
- [ ] Re-add team settings functionality (`apps/web/src/routes/_app/$orgId/settings/team.tsx:150`)
- [ ] Implement resend invitation mutation (`apps/web/src/routes/_app/$orgId/settings/invitations.tsx:69`)
- [ ] Scope layout to organization (`apps/web/src/routes/_app/$orgId/layout.tsx:21`)

### Data Layer
- [ ] Join with users to get author info in chat provider (`apps/web/src/providers/chat-provider.tsx:250`)
- [ ] Add presence to app sidebar (`apps/web/src/components/app-sidebar/app-sidebar.tsx:233`)

## Backend TODOs (apps/backend)

### Authentication & Authorization
- [ ] Create organization membership when user has organizationId (`apps/backend/src/routes/auth.http.ts:99`)
- [ ] Implement smarter role-based policies (`apps/backend/src/policies/channel-policy.ts:26,39,53`)

### File Handling
- [ ] Map errors for attachment uploads (`apps/backend/src/routes/attachments.http.ts:44`)

## Database TODOs (packages/db)


## Technical Debt

### Testing
- [ ] Add comprehensive test coverage for new features
- [ ] Integration tests for real-time features

## Notes
- Line numbers reference specific TODO comments in the codebase
- Some TODOs may require architectural decisions before implementation
- Priority should be given to features that affect user experience directly