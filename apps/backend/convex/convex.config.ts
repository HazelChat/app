import pushNotifications from "@convex-dev/expo-push-notifications/convex.config"
import { defineApp } from "convex/server"
import r2 from "@convex-dev/r2/convex.config"

const app = defineApp()
app.use(pushNotifications)
app.use(r2)

export default app
