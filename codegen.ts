import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: 'http://localhost:3000/api/v1/graphql',
    ignoreNoDocuments: true,
    generates: {
        'generated/schema.graphql': {
            documents: [],
            plugins: [
                'schema-ast',
            ],
            config: {
                includeDirectives: true,
            },
        },
        'generated/gql-operations-generated.ts': {
            documents: ['./config/operations.graphql'],
            plugins: [
                'typescript',
                'typescript-operations',
                'typescript-graphql-request'
            ],
            config: {
                skipTypename: false,
                enumsAsTypes: false,
                dedupeOperationSuffix: true,
                omitOperationSuffix: false,
                documentMode: 'documentNode',
                avoidOptionals: {
                    field: true,
                    inputValue: false,
                    object: false,
                    defaultValue: false,
                },
                scalars: {
                    DateTime: 'string',
                },
            },
        },
    },
};

export default config;