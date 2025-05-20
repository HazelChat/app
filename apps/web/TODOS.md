# TODOs



# Web

## Chat UI
!!! fix threads input focus (should focus on threwad input when in thread)
- Fix Reply to Preview of Message if it's a markdown thing like a image display an icon
- Emoji Picker
- Add day/week/year to pinned message list
- Add some Date viewer to shown messages
- Fix weird Avatar flashing caused by reloads (probbaly means to fork virtua and change For to Index for our usecase)
- Image preview
    - Add multiple images in the prop
    - Maybe show metadata like filename, filesize and resolution somewhere

-- Later TODOS
- Delete Message
- Edit Message

## Notifications
- Extend Notification manager on the client
(this should track if you are active or not and if you are in the right channel and ping you accordingly)
- Add reconnect flow to Ably

## Components and Pages
- Profile Popover + Dialog (see discord user profiles)
- Settings Page 
    - Themes (dark/light/contrast)
    - Languages
    - Change Username/Avatar

## Server Page
- Kick User
- Manage Roles


# Server


# Investigations
- Look into [campsite](https://github.com/campsite/campsite) for product inspiration
 - Run it locally

 - Look into [huly](https://huly.app/workbench/hazel/chunter/threads) for product inspiration

 - Look into Bridges here Slack to Chat Sync https://matrix.org/ecosystem/bridges/