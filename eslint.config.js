const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  { ignores: ['dist/**', 'web-build/**', 'supabase/functions/**'] },
  ...expoConfig,
  prettierConfig,
]);
