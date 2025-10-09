# Effect-Atom State Management Refactoring Plan

## Current State Analysis

The app currently uses effect-atom in these areas:
- ✅ Version checking with streams (`apps/web/src/atoms/version-atom.ts`)
- ✅ Presence management (`apps/web/src/hooks/use-presence.ts`)
- ✅ Auth state with HTTP API (`apps/web/src/lib/auth.tsx`)
- ✅ API client setup (`apps/web/src/lib/services/common/atom-client.ts`)

## Refactoring Opportunities

### ✅ Completed Refactorings

#### 1. Theme Management ✅
**File**: `apps/web/src/components/theme-provider.tsx`

**Status**: COMPLETED
- Migrated to `Atom.kvs` with BrowserKeyValueStore.layerLocalStorage
- Eliminated Context API boilerplate
- Removed manual localStorage management
- Added Schema validation with `Schema.Literal`
- Maintained same public API (zero breaking changes)
- Created `resolvedThemeAtom` for system theme resolution

**Results**:
- ~35 lines of code removed
- Automatic localStorage persistence
- Better type safety
- Cleaner, more functional code

---

#### 2. Notification Sound Settings ✅
**File**: `apps/web/src/hooks/use-notification-sound.tsx`

**Status**: COMPLETED
- Migrated to `Atom.kvs` with BrowserKeyValueStore.layerLocalStorage
- Eliminated all manual localStorage code
- Added Schema validation with `NotificationSoundSettingsSchema`
- Maintained same hook API (zero breaking changes)
- Audio playback logic unchanged

**Results**:
- ~55 lines of boilerplate removed
- Automatic Schema validation
- Settings accessible globally
- Simplified state management

---

### 🔥 Priority 1: High Impact (Remaining)

#### 3. Chat Context State
**File**: `apps/web/src/providers/chat-provider.tsx`

**Current**: Context + useState (lines 79-82)
```tsx
const [replyToMessageId, setReplyToMessageId] = useState<MessageId | null>(null)
const [activeThreadChannelId, setActiveThreadChannelId] = useState<ChannelId | null>(null)
const [activeThreadMessageId, setActiveThreadMessageId] = useState<MessageId | null>(null)
```

**Target**: Global atoms with optional persistence
```tsx
// Create atoms that can be accessed anywhere
const replyToMessageAtom = Atom.make<MessageId | null>(null).pipe(Atom.keepAlive)
const activeThreadAtom = Atom.make<{ channelId: ChannelId; messageId: MessageId } | null>(null).pipe(Atom.keepAlive)

// Or use Atom.family for per-channel state
const channelReplyStateAtom = Atom.family((channelId: ChannelId) =>
  Atom.make<MessageId | null>(null)
)
```

**Benefits**:
- Accessible outside ChatProvider
- Can integrate with Reactivity for mutations
- Easier to test
- Better composition

---

#### 4. File Upload State Management
**File**: `apps/web/src/hooks/use-file-upload.tsx`

**Current**: Map-based state (line 35)
```tsx
const [uploads, setUploads] = useState<Map<string, FileUploadProgress>>(new Map())
```

**Target**: Use `Atom.family` for individual upload atoms
```tsx
const fileUploadAtom = Atom.family((fileId: string) =>
  Atom.make<FileUploadProgress>({
    fileId,
    status: "pending",
    progress: 0,
    // ...
  })
)

// Track active uploads
const activeUploadsAtom = Atom.make<Set<string>>(new Set()).pipe(Atom.keepAlive)
```

**Benefits**:
- Individual subscriptions per upload
- Better reactivity (only re-render affected uploads)
- Easier to implement retry logic
- Can show upload progress across different components

---

### 🎯 Priority 2: Medium Impact (Complex State)

#### 5. Command Palette Navigation
**File**: `apps/web/src/components/command-palette.tsx`

**Current**: Multiple useState hooks (lines 45-47)
```tsx
const [currentPage, setCurrentPage] = useState<Page>("home")
const [pageHistory, setPageHistory] = useState<Page[]>([])
const [inputValue, setInputValue] = useState("")
```

**Target**: Unified atom with navigation state
```tsx
const commandPaletteStateAtom = Atom.make({
  currentPage: "home" as Page,
  pageHistory: [] as Page[],
  inputValue: "",
  isOpen: false,
}).pipe(Atom.keepAlive)

// Or separate atoms for better granularity
const commandPageAtom = Atom.make<Page>("home")
const commandHistoryAtom = Atom.make<Page[]>([])
const commandSearchAtom = Atom.make("")
```

**Benefits**:
- State persists across modal open/close
- Can implement search history
- Better testing
- Can use Atom.searchParam for URL integration

---

#### 6. Modal State Registry
**Files**: Multiple files with modal useState (~15 occurrences)

**Current**: Scattered useState across components
```tsx
const [isModalOpen, setIsModalOpen] = useState(false)
const [showInviteModal, setShowInviteModal] = useState(false)
// ... many more
```

**Target**: Centralized modal registry
```tsx
type ModalId =
  | "create-channel"
  | "create-dm"
  | "invite-member"
  | "delete-message"
  // ... etc

const modalStateAtom = Atom.family((modalId: ModalId) =>
  Atom.make<{ isOpen: boolean; data?: unknown }>({
    isOpen: false,
  })
)

// Helper function atoms
const openModalAtom = Atom.fn(
  Effect.fnUntraced(function* (modalId: ModalId, data?: unknown) {
    yield* Atom.set(modalStateAtom(modalId), { isOpen: true, data })
  })
)
```

**Benefits**:
- Programmatic modal control from anywhere
- Can pass data between modals
- Better modal stacking/history
- Analytics integration point

---

#### 7. Notification Settings Form State
**File**: `apps/web/src/routes/_app/$orgSlug/settings/notifications.tsx`

**Current**: Multiple independent useState (lines 24-31)
```tsx
const [desktopNotifications, setDesktopNotifications] = useState(true)
const [messagePreference, setMessagePreference] = useState<"all" | "mentions" | "direct" | "none">("all")
const [emailNotifications, setEmailNotifications] = useState(true)
// ... 6 more state variables
```

**Target**: Single atom with mutations
```tsx
const notificationSettingsAtom = HazelApiClient.query("settings", "getNotifications", {
  reactivityKeys: ["notificationSettings"],
})

const updateNotificationSettingsMutation = HazelApiClient.mutation("settings", "updateNotifications")
```

**Benefits**:
- Optimistic updates
- Server sync
- Form state matches server state
- Can use Reactivity for auto-refresh

---

### 💡 Priority 3: Nice to Have (UI State)

#### 8. Message Item UI State
**File**: `apps/web/src/components/chat/message-item.tsx`

**Current**: Component-local useState (lines 43-45)
```tsx
const [isEditing, setIsEditing] = useState(false)
const [hasBeenHovered, setHasBeenHovered] = useState(false)
const [isMenuOpen, setIsMenuOpen] = useState(false)
```

**Target**: Atom.family keyed by message ID
```tsx
const messageUIStateAtom = Atom.family((messageId: MessageId) =>
  Atom.make({
    isEditing: false,
    hasBeenHovered: false,
    isMenuOpen: false,
  })
)
```

**Benefits**:
- State survives re-renders during virtualization
- Better animation coordination
- Easier to implement "edit mode" from elsewhere

---

#### 9. Search & Filter States
**Files**: Multiple components with search state

**Current**: Local useState
```tsx
const [searchQuery, setSearchQuery] = useState("")
const [selectedCategory, setSelectedCategory] = useState<string>("all")
```

**Target**: URL-synchronized atoms
```tsx
const searchQueryAtom = Atom.searchParam("q")
const categoryFilterAtom = Atom.searchParam("category", {
  schema: Schema.Literal("all", "integrations", "security"),
  defaultValue: () => "all"
})
```

**Benefits**:
- Shareable URLs with filters
- Browser back/forward support
- State persists across navigation

---

#### 10. Dropdown & Picker States
**Files**: `message-toolbar.tsx` and others

**Current**: Multiple useState for UI toggles
```tsx
const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
const [deleteModalOpen, setDeleteModalOpen] = useState(false)
const [dropdownOpen, setDropdownOpen] = useState(false)
```

**Target**: Atom.family with message/entity ID
```tsx
const messageToolbarStateAtom = Atom.family((messageId: MessageId) =>
  Atom.make({
    emojiPickerOpen: false,
    deleteModalOpen: false,
    dropdownOpen: false,
  })
)
```

**Benefits**:
- Prevents state conflicts with multiple messages
- Better cleanup
- Can close all on navigation

---

## Implementation Strategy

### Phase 1: Storage & Persistence ✅ COMPLETED
1. ✅ Theme management → Atom.kvs
2. ✅ Notification sound settings → Atom.kvs
3. ✅ Tested and validated localStorage integration

### Phase 2: Critical User Features (Next)
3. Chat context state → Global atoms
4. File upload state → Atom.family
5. Integration testing

### Phase 3: UI Polish (Week 3)
7. Command palette atoms
8. Modal state registry
9. Notification settings form

### Phase 4: Refinements (Week 4)
10. Message UI state
11. Search param integration
12. Remaining UI states

---

## Success Metrics

### Phase 1 Results ✅
- ✅ Reduced useState usage in 2 files (100% of Phase 1 targets)
- ✅ Eliminated ~90 lines of manual localStorage code
- ✅ Added Schema validation for theme and notification settings
- ✅ Zero breaking changes - all APIs maintained
- ✅ Reduced bundle size (eliminated Context boilerplate in theme-provider)
- ✅ Better type safety with Effect Schema
- ✅ Enhanced DX with declarative atoms

### Overall Progress
- **Phase 1**: ✅ 2/2 completed (100%)
- **Phase 2**: 🔜 0/2 completed (0%)
- **Phase 3**: ⏸️ 0/3 completed (0%)
- **Phase 4**: ⏸️ 0/3 completed (0%)

### Remaining Targets
- 🎯 Migrate chat context state to global atoms
- 🎯 Implement file upload atoms with Atom.family
- 🎯 Complete remaining UI state refactorings

---

## Notes

- All atoms should use `Atom.keepAlive` for shared state
- Use `Atom.family` for dynamic collections
- Prefer `Atom.kvs` over manual localStorage
- Integrate with `Reactivity` for mutation invalidation
- Use `Schema` for runtime validation
- Consider URL sync with `Atom.searchParam` where appropriate
