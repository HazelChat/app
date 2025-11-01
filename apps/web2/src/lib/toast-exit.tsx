import { Cause, Chunk, Exit, Option } from "effect"
import { toast } from "sonner"

/**
 * Extracts a user-friendly error message from a Cause.
 * Prioritizes failures over defects and formats them concisely for toasts.
 */
function formatCauseMessage<E>(cause: Cause.Cause<E>): string {
	// Try to get failures first (expected errors)
	const failures = Cause.failures(cause)
	const firstFailureOption = Chunk.head(failures)

	if (Option.isSome(firstFailureOption)) {
		const firstFailure = firstFailureOption.value
		// Handle Error objects vs plain values
		if (firstFailure instanceof Error) {
			return firstFailure.message
		}
		if (typeof firstFailure === "string") {
			return firstFailure
		}
		// For objects, try to extract a message property
		if (typeof firstFailure === "object" && firstFailure !== null && "message" in firstFailure) {
			return String(firstFailure.message)
		}
		return String(firstFailure)
	}

	// If no failures, try defects (unexpected errors)
	const defects = Cause.defects(cause)
	const firstDefectOption = Chunk.head(defects)

	if (Option.isSome(firstDefectOption)) {
		const firstDefect = firstDefectOption.value
		if (firstDefect instanceof Error) {
			return firstDefect.message
		}
		return String(firstDefect)
	}

	return "An error occurred"
}

export interface ToastExitOptions<A, E> {
	loading: string
	success: string | ((value: A) => string)
	error?: string | ((cause: Cause.Cause<E>) => string)
}

/**
 * Toast utility for Effect Exit types from promiseExit mode.
 *
 * Unlike toast.promise(), this handles Exit<A, E> which always resolves
 * but contains either Success or Failure state.
 *
 * @example
 * ```tsx
 * toastExit(
 *   createChannel({ payload: {...} }),
 *   {
 *     loading: "Creating channel...",
 *     success: (result) => `Channel created: ${result.data.name}`,
 *     // error is optional - will extract from Cause if not provided
 *     error: "Failed to create channel"
 *   }
 * )
 * ```
 */
export async function toastExit<A, E>(
	promiseExit: Promise<Exit.Exit<A, E>>,
	options: ToastExitOptions<A, E>,
): Promise<Exit.Exit<A, E>> {
	const loadingToast = toast.loading(options.loading)

	const exit = await promiseExit

	return Exit.match(exit, {
		onSuccess: (value) => {
			const message = typeof options.success === "function" ? options.success(value) : options.success
			toast.success(
				message,

				{ id: loadingToast },
			)
			return exit
		},
		onFailure: (cause) => {
			const message = options.error
				? typeof options.error === "function"
					? options.error(cause)
					: options.error
				: formatCauseMessage(cause)
			toast.error(message, { id: loadingToast })
			return exit
		},
	})
}
