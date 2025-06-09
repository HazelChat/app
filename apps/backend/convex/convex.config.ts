import pushNotifications from "@convex-dev/expo-push-notifications/convex.config"
import presence from "@convex-dev/presence/convex.config"

import { defineApp } from "convex/server"
import r2 from "@convex-dev/r2/convex.config"

const app = defineApp()
app.use(pushNotifications)
app.use(r2)
app.use(presence)

export default app
