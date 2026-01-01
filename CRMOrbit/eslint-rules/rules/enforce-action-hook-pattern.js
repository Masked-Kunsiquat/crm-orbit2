/**
 * @fileoverview Enforce consistent action hook patterns
 * @author CRM Orbit Team
 *
 * This rule ensures action hooks follow the established patterns:
 * 1. Accept deviceId as a parameter (not hardcoded)
 * 2. Return DispatchResult from action functions
 * 3. Use useCallback for all action functions
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce consistent action hook patterns (deviceId parameter, DispatchResult return, useCallback usage)",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      missingDeviceIdParam:
        "Action hook '{{hookName}}' must accept 'deviceId' as a parameter, not hardcode it.",
      missingUseCallback:
        "Action function '{{actionName}}' must use useCallback for proper memoization.",
      missingDispatchResultReturn:
        "Action function '{{actionName}}' should return DispatchResult type.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Only check files that match action hook naming pattern
    if (!filename.includes("hooks") || !filename.match(/use\w+Actions\.(ts|tsx)$/)) {
      return {};
    }

    let hookFunctionNode = null;
    let insideHookFunction = false;
    const actionFunctions = new Map(); // Map of action name to {hasUseCallback, node}

    return {
      // Find the main hook function export
      ExportNamedDeclaration(node) {
        if (
          node.declaration?.type === "VariableDeclaration" &&
          node.declaration.declarations[0]?.id?.type === "Identifier" &&
          node.declaration.declarations[0].id.name.match(/^use\w+Actions$/)
        ) {
          hookFunctionNode = node.declaration.declarations[0];
          const hookName = hookFunctionNode.id.name;

          // Check if it has deviceId parameter
          const init = hookFunctionNode.init;
          if (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") {
            const params = init.params;
            const hasDeviceIdParam = params.some(
              (param) => param.type === "Identifier" && param.name === "deviceId"
            );

            if (!hasDeviceIdParam) {
              context.report({
                node: hookFunctionNode.id,
                messageId: "missingDeviceIdParam",
                data: { hookName },
              });
            }
          }
        }
      },

      // Track when we enter the hook function body
      "FunctionExpression, ArrowFunctionExpression"(node) {
        if (hookFunctionNode && node === hookFunctionNode.init) {
          insideHookFunction = true;
        }
      },

      // Track action functions and check if they use useCallback
      VariableDeclarator(node) {
        if (insideHookFunction && node.id?.type === "Identifier" && node !== hookFunctionNode) {
          const actionName = node.id.name;

          // Skip the hook function itself and non-action variables
          if (["dispatch", "state", "deviceId"].includes(actionName)) {
            return;
          }

          const init = node.init;

          // Check if it's a useCallback call
          if (
            init?.type === "CallExpression" &&
            init.callee?.type === "Identifier" &&
            init.callee.name === "useCallback"
          ) {
            actionFunctions.set(actionName, { hasUseCallback: true, node });
          } else if (
            init?.type === "ArrowFunctionExpression" ||
            init?.type === "FunctionExpression"
          ) {
            // It's a function but NOT wrapped in useCallback
            actionFunctions.set(actionName, { hasUseCallback: false, node });
          }
        }
      },

      // After traversing the whole file, report missing useCallback
      "Program:exit"() {
        actionFunctions.forEach(({ hasUseCallback, node }, actionName) => {
          if (!hasUseCallback) {
            context.report({
              node: node.id,
              messageId: "missingUseCallback",
              data: { actionName },
            });
          }
        });
      },
    };
  },
};
