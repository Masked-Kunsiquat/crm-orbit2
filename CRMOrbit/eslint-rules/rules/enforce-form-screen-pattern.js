/**
 * @fileoverview Enforce consistent form screen patterns
 * @author CRM Orbit Team
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce consistent form screen patterns (no unused _isDirty state)",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      unusedIsDirty:
        "Remove unused '_isDirty' state variable. Either use it or remove the state declaration.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Only check form screen files
    if (!filename.includes("FormScreen")) {
      return {};
    }

    let hasIsDirtyVariable = false;
    let isDirtyIsUsed = false;
    let isDirtyNode = null;

    return {
      VariableDeclarator(node) {
        // Check for const [_isDirty, setIsDirty] = useState(false);
        if (
          node.id?.type === "ArrayPattern" &&
          node.id.elements[0]?.type === "Identifier" &&
          node.id.elements[0].name === "_isDirty"
        ) {
          hasIsDirtyVariable = true;
          isDirtyNode = node.id.elements[0];
        }
      },

      Identifier(node) {
        // Check if _isDirty is referenced anywhere (excluding the declaration)
        if (node.name === "_isDirty" && node !== isDirtyNode) {
          isDirtyIsUsed = true;
        }
      },

      "Program:exit"() {
        // If _isDirty is declared but never used, report it
        if (hasIsDirtyVariable && !isDirtyIsUsed && isDirtyNode) {
          context.report({
            node: isDirtyNode,
            messageId: "unusedIsDirty",
          });
        }
      },
    };
  },
};
