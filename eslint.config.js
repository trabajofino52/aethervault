import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'deploy/**/*', 'src/**/*', 'server/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
