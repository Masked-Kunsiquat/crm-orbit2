/**
 * @fileoverview Disallow duplicate helper functions that should be imported from shared modules
 * @author CRM Orbit Team
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow duplicate helper functions that should be imported from shared modules",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      duplicateHelper:
        "Function '{{name}}' should be imported from '{{sharedPath}}' instead of being duplicated",
    },
    schema: [],
  },

  create(context) {
    // Map of function names to their canonical shared module path
    const duplicateFunctions = {
      resolveEntityId: "reducers/shared",
    };

    const filename = context.getFilename();

    // Don't flag functions in the shared module itself
    if (
      filename.includes("reducers/shared") ||
      filename.includes("reducers\\shared")
    ) {
      return {};
    }

    return {
      FunctionDeclaration(node) {
        const funcName = node.id?.name;
        if (funcName && duplicateFunctions[funcName]) {
          context.report({
            node,
            messageId: "duplicateHelper",
            data: {
              name: funcName,
              sharedPath: duplicateFunctions[funcName],
            },
          });
        }
      },
      VariableDeclarator(node) {
        const varName = node.id?.name;
        if (varName && duplicateFunctions[varName]) {
          // Only flag if it's a function (arrow function or function expression)
          if (
            node.init &&
            (node.init.type === "ArrowFunctionExpression" ||
              node.init.type === "FunctionExpression")
          ) {
            context.report({
              node,
              messageId: "duplicateHelper",
              data: {
                name: varName,
                sharedPath: duplicateFunctions[varName],
              },
            });
          }
        }
      },
    };
  },
};
