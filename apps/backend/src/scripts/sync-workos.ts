import { withSystemActor } from "@hazel/effect-lib"
import { Effect, Logger } from "effect"
import { WorkOSSync } from "../services/workos-sync"

const syncWorkos = Effect.gen(function* () {
	const workOsSync = yield* WorkOSSync

	yield* workOsSync.syncAll.pipe(withSystemActor)
}).pipe(Effect.provide(WorkOSSync.Default), Effect.provide(Logger.pretty))

Effect.runPromise(syncWorkos)
