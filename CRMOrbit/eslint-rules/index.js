/**
 * @fileoverview Custom ESLint rules for CRM Orbit architecture enforcement
 * @author CRM Orbit Team
 */

import noDuplicateHelpers from "./rules/no-duplicate-helpers.js";
import enforceI18nValidation from "./rules/enforce-i18n-validation.js";

export default {
  rules: {
    "no-duplicate-helpers": noDuplicateHelpers,
    "enforce-i18n-validation": enforceI18nValidation,
  },
};
