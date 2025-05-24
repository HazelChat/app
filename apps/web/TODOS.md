# TODOs



# Web

## Chat UI
- fix threads input focus (should focus on thread input when in thread)
- Emoji Picker
- Add day/week/year to pinned message list
- Add some Date viewer to shown messages ( what date is this message from)
- Fix weird Avatar flashing caused by reloads (probbaly means to fork virtua and change For to Index for our usecase)
- Image preview
    - Maybe show metadata like filename, filesize and resolution somewhere
    - Add simple zoom in/out functionality
- Make Uploading    
 - Show some progress 
 - Multi file upload should be display better
 - Dont allow uploading the same file multiple times
 - Don't allow sending message file uploading

-- Later TODOS
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


 # ScyllaDB Rework Todos

 - Integrate into the chatUI
 - Add channelID filters
 - Add Authentication to endpoints
 - Make Pagination Smarter DONT FETCH ALL MESSAGES KEKWS

 - Add Websocket and connect