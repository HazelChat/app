// Core collection creation

// Re-export useful types from electric-db-collection
export type { Txid } from "@tanstack/electric-db-collection"
export {
	type EffectElectricCollectionUtils,
	effectElectricCollectionOptions,
} from "./collection"
// Errors
export {
	DeleteError,
	ElectricCollectionError,
	InsertError,
	InvalidTxIdError,
	MissingTxIdError,
	SyncConfigError,
	TxIdTimeoutError,
	UpdateError,
} from "./errors"
// Effect handlers
export {
	convertDeleteHandler,
	convertInsertHandler,
	convertUpdateHandler,
} from "./handlers"
// Service and Layer APIs
export {
	ElectricCollection,
	type ElectricCollectionService,
	makeElectricCollectionLayer,
} from "./service"
// Types
export type {
	EffectDeleteHandler,
	EffectElectricCollectionConfig,
	EffectInsertHandler,
	EffectUpdateHandler,
} from "./types"
