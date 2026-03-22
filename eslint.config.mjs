import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["!**/*", "**/test.ts", "**/main.ts"]), {
    languageOptions: {
        globals: {
            ...globals.jest,
            ...globals.browser,
        },
    },
}, {
    files: ["**/*.ts"],

    extends: compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@angular-eslint/recommended",
        "plugin:@angular-eslint/template/process-inline-templates",
    ),

    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: [
                "projects/ng-http-caching/tsconfig.lib.json",
                "projects/ng-http-caching/tsconfig.spec.json",
                "projects/ng-http-caching-demo/tsconfig.app.json",
                "projects/ng-http-caching-demo/tsconfig.spec.json",
            ],

            createDefaultProgram: true,
        },
    },

    rules: {
        "@typescript-eslint/no-explicit-any": "off",

        "@angular-eslint/directive-selector": ["error", {
            type: "attribute",
            prefix: "ng",
            style: "camelCase",
        }],

        "@angular-eslint/component-selector": ["error", {
            type: "element",
            prefix: "ng",
            style: "kebab-case",
        }],
    },
}, {
    files: ["**/*.html"],
    extends: compat.extends("plugin:@angular-eslint/template/recommended"),
    rules: {},
}]);