# Missing Icons

The following 33 icons from @untitledui/icons need to be created in `/src/components/icons/` to complete the migration:

## UI/Navigation Icons (13)

- **AlertCircle** - Used in: notifications, file-upload-preview
- **AlertTriangle** - Used in: settings/debug, settings/team
- **ArrowDown** - Used in: table
- **ArrowLeft** - Used in: pagination
- **ArrowRight** - Used in: pagination
- **Check** - Used in: block-list-static, select-item
- **CheckCircle** - Used in: notifications, file-upload-base
- **ChevronDown** - Used in: select, select-native, nav-item
- **ChevronSelectorVertical** - Used in: table, nav-account-card
- **InfoCircle** - Used in: notifications, input
- **Loading01** - Used in: emoji-picker
- **Menu02** - Used in: mobile-header
- **XCircle** - Used in: file-upload-base

## Content/File Icons (12)

- **BookOpen01** - Used in: nav-account-card
- **Code02** - Used in: slash-node (editor)
- **Database01** - Used in: settings/debug
- **Download01** - Used in: message-attachments
- **DownloadCloud02** - Used in: messaging, file-upload-base
- **FileCheck02** - Used in: file-upload-preview
- **ItalicSquare** - Used in: message-composer-actions
- **Link03** - Used in: messaging
- **List** - Used in: slash-node (editor)
- **Type01** - Used in: slash-node (editor)
- **UploadCloud02** - Used in: file-upload-base

## Building/Organization Icons (8)

- **Building02** - Used in: onboarding/setup-organization, onboarding/index, create-organization-modal
- **Container** - Used in: nav-user
- **Flag01** - Used in: message-toolbar (report message)
- **LeftIndent01** - Used in: ui/sidebar
- **LayersTwo01** - Used in: nav-user
- **PhoneCall01** - Used in: routes/$orgSlug/index
- **RefreshCcw02** - Used in: messaging, settings/invitations
- **RefreshCw01** - Used in: file-upload-preview
- **Users01** - Used in: onboarding/index

## Priority Icons

### High Priority (frequently used):
1. **AlertCircle** - Error/warning states
2. **CheckCircle** - Success states
3. **InfoCircle** - Info states
4. **ChevronDown** - Dropdowns/selects
5. **ArrowLeft/ArrowRight** - Pagination
6. **Download01** - File downloads
7. **UploadCloud02** - File uploads

### Medium Priority (UI components):
8. **Check** - Checkboxes/selections
9. **XCircle** - Error indicators
10. **Loading01** - Loading states
11. **Menu02** - Mobile navigation
12. **ChevronSelectorVertical** - Table sorting

### Low Priority (specific features):
13. **Building02** - Organization setup
14. **PhoneCall01** - Call features
15. **Flag01** - Reporting
16. All editor icons (Code02, List, Type01, ItalicSquare)

## Notes

- Some icons may already exist in your new icon set with different names
- Check if similar icons can be reused (e.g., RefreshCw01 and RefreshCcw02 might be the same)
- Icons are listed by frequency of use and criticality
