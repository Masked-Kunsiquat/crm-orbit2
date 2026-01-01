/**
 * @fileoverview Custom ESLint rules for CRM Orbit architecture enforcement
 * @author CRM Orbit Team
 */

import noDuplicateHelpers from "./rules/no-duplicate-helpers.js";

export default {
  rules: {
    "no-duplicate-helpers": noDuplicateHelpers,
  },
};
