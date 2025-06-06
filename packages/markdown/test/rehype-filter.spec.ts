import type { Element, Root, Text } from "hast";
import { describe, expect, test } from "vitest";
import rehypeFilter from "../src/rehype-filter";

function createRoot(children: Element[]): Root {
  return { type: "root", children };
}

function createElement(tagName: string, children: (Element | Text)[] = []): Element {
  return { type: "element", tagName, properties: {}, children };
}

function createText(value: string): Text {
  return { type: "text", value };
}

describe("rehype-filter", () => {
  test("throws when both allowed and disallowed provided", () => {
    expect(() =>
      rehypeFilter({ allowedElements: ["a"], disallowedElements: ["b"], unwrapDisallowed: false })
    ).toThrow(TypeError);
  });

  test("keeps only allowed elements", () => {
    const tree = createRoot([createElement("div"), createElement("span")]);
    const plugin = rehypeFilter({ allowedElements: ["div"], unwrapDisallowed: false })!;
    plugin(tree);
    expect(tree.children).toHaveLength(1);
    expect((tree.children[0] as Element).tagName).toBe("div");
  });

  test("removes disallowed elements", () => {
    const tree = createRoot([createElement("div"), createElement("span")]);
    const plugin = rehypeFilter({ disallowedElements: ["span"], unwrapDisallowed: false })!;
    plugin(tree);
    expect(tree.children).toHaveLength(1);
    expect((tree.children[0] as Element).tagName).toBe("div");
  });

  test("uses allowElement predicate", () => {
    const tree = createRoot([createElement("div"), createElement("span")]);
    const plugin = rehypeFilter({ allowElement: (el) => el.tagName !== "span", unwrapDisallowed: false })!;
    plugin(tree);
    expect(tree.children).toHaveLength(1);
    expect((tree.children[0] as Element).tagName).toBe("div");
  });

  test("unwraps disallowed elements", () => {
    const tree = createRoot([
      createElement("p", [createElement("span", [createText("hi")])]),
      createElement("em", [createText("bye")]),
    ]);
    const plugin = rehypeFilter({ disallowedElements: ["span"], unwrapDisallowed: true })!;
    plugin(tree);
    const p = tree.children[0] as Element;
    expect(p.children).toHaveLength(1);
    expect((p.children[0] as Text).value).toBe("hi");
  });
});
