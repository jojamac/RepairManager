import { global, process } from 'node:process';

export default {
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
