/**
 * @fileoverview Enforce i18n translation keys for validation messages
 * @author CRM Orbit Team
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Validation messages must use i18n translation keys instead of hardcoded strings",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      useI18nForValidation:
        "Validation message should use t() from useTranslation instead of hardcoded string '{{message}}'",
    },
    schema: [],
  },

  create(context) {
    // Keywords that indicate a validation message
    const validationKeywords = [
      "required",
      "invalid",
      "must",
      "cannot",
      "error",
      "failed",
      "missing",
    ];

    /**
     * Check if a string looks like a validation message
     */
    const looksLikeValidation = (str) => {
      if (typeof str !== "string") return false;
      const lowerStr = str.toLowerCase();
      return validationKeywords.some((keyword) => lowerStr.includes(keyword));
    };

    return {
      CallExpression(node) {
        // Check for Alert.alert calls
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "Alert" &&
          node.callee.property.name === "alert"
        ) {
          // Check the message argument (second argument)
          const messageArg = node.arguments[1];

          if (messageArg && messageArg.type === "Literal") {
            const messageValue = messageArg.value;

            if (looksLikeValidation(messageValue)) {
              context.report({
                node: messageArg,
                messageId: "useI18nForValidation",
                data: {
                  message: messageValue,
                },
              });
            }
          }
        }
      },
    };
  },
};
