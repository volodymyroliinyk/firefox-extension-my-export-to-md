export default [
    {
        files: ['tests/**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly',
                console: 'readonly',
                setImmediate: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
            'no-undef': 'error',
            'no-redeclare': 'error'
        }
    }
];
