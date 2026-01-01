/**
 * @fileoverview Custom ESLint rules for CRM Orbit architecture enforcement
 * @author CRM Orbit Team
 */

import noDuplicateHelpers from "./rules/no-duplicate-helpers.js";
import enforceI18nValidation from "./rules/enforce-i18n-validation.js";
import enforceFormScreenPattern from "./rules/enforce-form-screen-pattern.js";

export default {
  rules: {
    "no-duplicate-helpers": noDuplicateHelpers,
    "enforce-i18n-validation": enforceI18nValidation,
    "enforce-form-screen-pattern": enforceFormScreenPattern,
  },
};
