# Today
- fix channel creation not actually appearing in the channel list (due to reverse proxy querieng per channelId)
- add cache layer for integration data (linear issues etc.)
- test and actually build stuff for githib integration

- intgerations sometimes showing error "token already used" when connecting
- linear throwing 500's on issue in prod
- setup axiom or any other logging/monitoring solution


# FE stuff
- allow using Icons/Emojis for channel icon


# Later 
- rpc client for bot
- Migrate the missing icons to nucleo
- Forward message functionality (not yet implemented)
- Edit profile functionality (`apps/web/src/components/chat/user-profile-popover.tsx:205`)