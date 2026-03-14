import type { DOMElement } from "ink";

export interface CollectedNode {
  node: DOMElement;
  depth: number;
  tagName: string;
}

const walkTree = (node: DOMElement, depth: number, result: CollectedNode[]): void => {
  const tagName = node.nodeName ?? "";
  if (tagName && tagName !== "ink-root") {
    result.push({ node, depth, tagName });
  }

  for (const child of node.childNodes) {
    if ("nodeName" in child && typeof child.nodeName === "string") {
      walkTree(child as DOMElement, depth + 1, result);
    }
  }
};

export const collectNodes = (root: DOMElement): CollectedNode[] => {
  const result: CollectedNode[] = [];
  walkTree(root, 0, result);
  return result;
};
