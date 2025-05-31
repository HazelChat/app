- Rebuild the UI (Rethink some of the fetching i previously did)
- Add Convex R2 file serving (think important for saving on the convex bandwidth tax lol)


- There is a bug in the clerk x convex auth flow, the inital token doesnt seem to get created, 
but seesm to be when we create the token manually in our beforeLoad function lol.
Needs to be investigated

- Add isLoading and error state to createQuery
- Add error tuple to createMutation
- Add convex client tests to our sdk