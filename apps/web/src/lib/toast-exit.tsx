import { Cause, Chunk, Exit, Option } from "effect"
import { type ExternalToast, toast } from "sonner"

import {
	type CommonAppError,
	DEFAULT_ERROR_MESSAGE,
	getCommonErrorMessage,
	getUserFriendlyError,
	isCommonAppError,
	type UserErrorMessage,
} from "./error-messages"

/**
 * String literal union of all common error tags.
 * Derived from the CommonAppError type for single source of truth.
 */
type CommonErrorTag = CommonAppError["_tag"]

/**
 * Extracts the _tag literal types from a union of tagged errors,
 * excluding common errors that are already handled.
 */
type NonCommonErrorTags<E> = E extends { _tag: infer T extends string }
	? T extends CommonErrorTag
		? never
		: T
	: never

/**
 * Extracts ALL _tag literal types from a union of tagged errors.
 */
type AllErrorTags<E> = E extends { _tag: infer T extends string } ? T : never

/**
 * Maps error tags to their handler functions.
 * Handlers for non-common errors are required.
 * Handlers for common errors are optional (for context-specific overrides).
 */
type CustomErrorHandlers<E> = {
	[K in NonCommonErrorTags<E>]: (error: Extract<E, { _tag: K }>) => UserErrorMessage
} & {
	[K in AllErrorTags<E> & CommonErrorTag]?: (error: Extract<E, { _tag: K }>) => UserErrorMessage
}

/**
 * Conditionally requires customErrors if E contains non-common errors.
 * If all errors in E are CommonAppError, customErrors is optional but can still
 * be provided for context-specific overrides.
 */
type RequireCustomErrorsIfNeeded<E> = NonCommonErrorTags<E> extends never
	? {
			customErrors?: Partial<{
				[K in AllErrorTags<E> & CommonErrorTag]: (error: Extract<E, { _tag: K }>) => UserErrorMessage
			}>
		}
	: { customErrors: CustomErrorHandlers<E> }

export type ToastExitOptions<A, E> = {
	loading: string
	success: string | ((value: A) => string)
	/** @deprecated Use customErrors for type-safe error handling */
	error?: string | ((cause: Cause.Cause<E>) => string)
	/** Callback executed after success toast is shown */
	onSuccess?: (value: A) => void | Promise<void>
	/** Callback executed after error toast is shown */
	onFailure?: (cause: Cause.Cause<E>) => void
	/** Retry action configuration for error toasts */
	retry?: {
		label?: string
		onRetry: () => void | Promise<void>
	}
	/** Show detailed error description from Cause.pretty() */
	showErrorDescription?: boolean
} & RequireCustomErrorsIfNeeded<E>

/**
 * Gets the error message using custom handlers first, then common handlers.
 */
function getErrorMessage<E extends { _tag: string }>(
	error: E,
	// biome-ignore lint/suspicious/noExplicitAny: Runtime type checking handles safety
	customHandlers?: Partial<Record<string, (error: any) => UserErrorMessage>>,
): UserErrorMessage {
	// Check custom handlers first (for non-common errors)
	if (customHandlers && error._tag in customHandlers) {
		const handler = customHandlers[error._tag]
		if (handler) {
			return handler(error)
		}
	}

	// Fall back to common error handler
	if (isCommonAppError(error)) {
		return getCommonErrorMessage(error)
	}

	// Should not reach here if types are correct, but fallback just in case
	return DEFAULT_ERROR_MESSAGE
}

/**
 * Toast utility for Effect Exit types from promiseExit mode.
 *
 * Unlike toast.promise(), this handles Exit<A, E> which always resolves
 * but contains either Success or Failure state.
 *
 * Common errors (UnauthorizedError, InternalServerError, etc.) are handled
 * automatically. For any other errors in E, you MUST provide customErrors.
 *
 * @example
 * ```tsx
 * // RPC returns: ChannelNotFoundError | UnauthorizedError | InternalServerError
 * toastExit(
 *   deleteChannel({ channelId }),
 *   {
 *     loading: "Deleting channel...",
 *     success: "Channel deleted",
 *     // TypeScript REQUIRES customErrors because ChannelNotFoundError is not common
 *     customErrors: {
 *       ChannelNotFoundError: () => ({
 *         title: "Channel not found",
 *         description: "This channel may have been deleted.",
 *         isRetryable: false,
 *       }),
 *     },
 *   }
 * )
 *
 * // RPC returns only: UnauthorizedError | InternalServerError (all common)
 * toastExit(
 *   updateUser({ userId, data }),
 *   {
 *     loading: "Updating...",
 *     success: "Updated",
 *     // customErrors NOT required - all errors are handled automatically
 *   }
 * )
 * ```
 */
export async function toastExit<A, E extends { _tag: string }>(
	promiseExit: Promise<Exit.Exit<A, E>>,
	options: ToastExitOptions<A, E>,
): Promise<Exit.Exit<A, E>> {
	const loadingToast = toast.loading(options.loading)

	const exit = await promiseExit

	return Exit.match(exit, {
		onSuccess: async (value) => {
			const message = typeof options.success === "function" ? options.success(value) : options.success
			toast.success(message, { id: loadingToast })
			await options.onSuccess?.(value)
			return exit
		},
		onFailure: (cause) => {
			const toastOptions: ExternalToast = { id: loadingToast }

			let message: string
			let description: string | undefined

			// Use legacy error option if provided (deprecated)
			if (options.error) {
				message = typeof options.error === "function" ? options.error(cause) : options.error
			} else {
				// Extract error from cause
				const failures = Cause.failures(cause)
				const firstFailure = Chunk.head(failures)

				if (Option.isSome(firstFailure)) {
					const userError = getErrorMessage(firstFailure.value, options.customErrors)
					message = userError.title
					description = userError.description
				} else {
					const userError = getUserFriendlyError(cause)
					message = userError.title
					description = userError.description
				}

				if (description) {
					toastOptions.description = description
				}
			}

			if (options.showErrorDescription) {
				toastOptions.description = Cause.pretty(cause)
			}

			if (options.retry) {
				toastOptions.action = {
					label: options.retry.label ?? "Retry",
					onClick: () => options.retry?.onRetry(),
				}
			}

			toast.error(message, toastOptions)
			options.onFailure?.(cause)
			return exit
		},
	})
}

/**
 * Options for toastExitOnError - shows toast only on failure
 */
export type ToastExitOnErrorOptions<E> = {
	/** @deprecated Use customErrors for type-safe error handling */
	error?: string | ((cause: Cause.Cause<E>) => string)
	onFailure?: (cause: Cause.Cause<E>) => void
	retry?: {
		label?: string
		onRetry: () => void | Promise<void>
	}
	showErrorDescription?: boolean
} & RequireCustomErrorsIfNeeded<E>

/**
 * Toast utility for operations without loading state.
 * Only shows toast on failure - useful for background operations.
 *
 * @example
 * ```tsx
 * const exit = await sendMessage({ ... })
 * toastExitOnError(exit, {
 *   customErrors: {
 *     MessageNotFoundError: () => ({
 *       title: "Message not found",
 *       isRetryable: false,
 *     }),
 *   },
 * })
 * if (Exit.isSuccess(exit)) clearAttachments()
 * ```
 */
export function toastExitOnError<A, E extends { _tag: string }>(
	exit: Exit.Exit<A, E>,
	options: ToastExitOnErrorOptions<E>,
): Exit.Exit<A, E> {
	return Exit.match(exit, {
		onSuccess: () => exit,
		onFailure: (cause) => {
			const toastOptions: ExternalToast = {}

			let message: string
			let description: string | undefined

			if (options.error) {
				message = typeof options.error === "function" ? options.error(cause) : options.error
			} else {
				const failures = Cause.failures(cause)
				const firstFailure = Chunk.head(failures)

				if (Option.isSome(firstFailure)) {
					const userError = getErrorMessage(firstFailure.value, options.customErrors)
					message = userError.title
					description = userError.description
				} else {
					const userError = getUserFriendlyError(cause)
					message = userError.title
					description = userError.description
				}

				if (description) {
					toastOptions.description = description
				}
			}

			if (options.showErrorDescription) {
				toastOptions.description = Cause.pretty(cause)
			}

			if (options.retry) {
				toastOptions.action = {
					label: options.retry.label ?? "Retry",
					onClick: () => options.retry?.onRetry(),
				}
			}

			toast.error(message, toastOptions)
			options.onFailure?.(cause)
			return exit
		},
	})
}

/**
 * Options for matchExitWithToast - drop-in replacement for Exit.match + toast
 */
export type MatchExitWithToastOptions<A, E> = {
	onSuccess: (value: A) => void
	successMessage?: string
	/** @deprecated Use customErrors for type-safe error handling */
	errorMessage?: string
	showErrorDescription?: boolean
	retry?: {
		label?: string
		onRetry: () => void | Promise<void>
	}
} & RequireCustomErrorsIfNeeded<E>

/**
 * Drop-in replacement for manual Exit.match + toast patterns.
 *
 * @example
 * ```tsx
 * matchExitWithToast(exit, {
 *   onSuccess: () => cleanup(),
 *   successMessage: "Done",
 *   customErrors: {
 *     ChannelNotFoundError: () => ({
 *       title: "Channel not found",
 *       isRetryable: false,
 *     }),
 *   },
 * })
 * ```
 */
export function matchExitWithToast<A, E extends { _tag: string }>(
	exit: Exit.Exit<A, E>,
	options: MatchExitWithToastOptions<A, E>,
): void {
	Exit.match(exit, {
		onSuccess: (value) => {
			if (options.successMessage) {
				toast.success(options.successMessage)
			}
			options.onSuccess(value)
		},
		onFailure: (cause) => {
			const toastOptions: ExternalToast = {}

			let message: string
			let description: string | undefined

			if (options.errorMessage) {
				message = options.errorMessage
			} else {
				const failures = Cause.failures(cause)
				const firstFailure = Chunk.head(failures)

				if (Option.isSome(firstFailure)) {
					const userError = getErrorMessage(firstFailure.value, options.customErrors)
					message = userError.title
					description = userError.description
				} else {
					const userError = getUserFriendlyError(cause)
					message = userError.title
					description = userError.description
				}

				if (description) {
					toastOptions.description = description
				}
			}

			if (options.showErrorDescription) {
				toastOptions.description = Cause.pretty(cause)
			}

			if (options.retry) {
				toastOptions.action = {
					label: options.retry.label ?? "Retry",
					onClick: () => options.retry?.onRetry(),
				}
			}

			toast.error(message, toastOptions)
		},
	})
}
