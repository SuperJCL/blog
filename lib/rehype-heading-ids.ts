// Rehype plugin: gives a post's h2 and h3, in document order, the ids from its table of contents.
// compileMDX caches by file content only, so after changing this plugin delete .content-collections/cache.

type Node = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: Node[] };

export function rehypeHeadingIds({ ids }: { ids: string[] }) {
  return (tree: Node) => {
    let next = 0;
    const visit = (node: Node) => {
      if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3") && next < ids.length) {
        node.properties = { ...node.properties, id: ids[next++] };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
