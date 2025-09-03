import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier/flat'
import perfectionist from 'eslint-plugin-perfectionist'
import prettierPluginRecommended from 'eslint-plugin-prettier/recommended'
import unusedImports from 'eslint-plugin-unused-imports'
import {defineConfig} from 'eslint/config'
import {configs as typescriptConfigs} from 'typescript-eslint'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', '*.min.js'],
  },
  js.configs.recommended,
  typescriptConfigs.recommended,
  perfectionist.configs['recommended-natural'],
  prettierPluginRecommended,
  prettierConfig,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': [
        'error',
        {
          allow: ['error', 'info', 'warn', 'time', 'timeEnd'],
        },
      ],
      'perfectionist/sort-imports': 'error',
      'unused-imports/no-unused-imports': 'error',
    },
  },
])
