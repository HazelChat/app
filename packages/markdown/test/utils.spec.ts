import type { Element, Root } from "hast"
import { html } from "property-information"
import { describe, expect, test } from "vitest"
import type { Context } from "../src/types"
import { addProperty, flattenPosition, getElementsBeforeCount, getInputElement } from "../src/utils"

function createRoot(children: Element[]): Root {
	return { type: "root", children }
}

describe("utils", () => {
	test("getInputElement finds first input element", () => {
		const input: Element = { type: "element", tagName: "input", properties: {}, children: [] }
		const root = createRoot([{ type: "element", tagName: "div", properties: {}, children: [] }, input])
		expect(getInputElement(root)).toBe(input)
	})

	test("getInputElement returns null when absent", () => {
		const root = createRoot([{ type: "element", tagName: "span", properties: {}, children: [] }])
		expect(getInputElement(root)).toBeNull()
	})

	test("getElementsBeforeCount counts siblings", () => {
		const a: Element = { type: "element", tagName: "a", properties: {}, children: [] }
		const b: Element = { type: "element", tagName: "b", properties: {}, children: [] }
		const c: Element = { type: "element", tagName: "c", properties: {}, children: [] }
		const root = createRoot([a, b, c])
		expect(getElementsBeforeCount(root, c)).toBe(2)
	})

	test("addProperty handles className and arrays", () => {
		const ctx: Context = { options: {} as any, schema: html, listDepth: 0 }
		const props: Record<string, unknown> = {}
		addProperty(props, "className", ["foo", "bar"], ctx)
		expect(props).toEqual({ class: "foo bar" })
	})

        test("addProperty handles comma separated", () => {
                const ctx: Context = { options: {} as any, schema: html, listDepth: 0 }
                const props: Record<string, unknown> = {}
                addProperty(props, "accept", ["image/png", "image/jpeg"], ctx)
                expect(props).toEqual({ accept: "image/png, image/jpeg" })
        })

        test("addProperty ignores nullish values", () => {
                const ctx: Context = { options: {} as any, schema: html, listDepth: 0 }
                const props: Record<string, unknown> = { existing: true }
                addProperty(props, "href", undefined, ctx)
                expect(props).toEqual({ existing: true })
        })

        test("addProperty falls back to attribute name", () => {
                const ctx: Context = { options: {} as any, schema: html, listDepth: 0 }
                const props: Record<string, unknown> = {}
                addProperty(props, "aria-hidden", "true", ctx)
                expect(props["aria-hidden"]).toBe("true")
        })

	test("flattenPosition formats position", () => {
		const pos = { start: { line: 1, column: 2, offset: 0 }, end: { line: 3, column: 4, offset: 0 } }
		expect(flattenPosition(pos)).toBe("1:2-3:4")
	})
})
