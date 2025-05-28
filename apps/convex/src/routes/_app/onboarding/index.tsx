import { createFileRoute } from "@tanstack/solid-router"

import { type } from "arktype"
import { Match, Switch, createMemo } from "solid-js"
import { Serveronboarding } from "./-components/server-onboarding"
import { Useronboarding } from "./-components/user-onboarding"

const searchType = type({
	"step?": "'user' | 'server'",
})

export const Route = createFileRoute("/_app/onboarding/")({
	component: RouteComponent,
	validateSearch: searchType,
})

function RouteComponent() {
	const searchData = Route.useSearch()

	const currentStep = createMemo(() => searchData().step ?? "user")

	return (
		<div class="flex h-screen items-center justify-center">
			<Switch>
				<Match when={currentStep() === "user"}>
					<Useronboarding />
				</Match>
				<Match when={currentStep() === "server"}>
					<Serveronboarding />
				</Match>
			</Switch>
		</div>
	)
}
