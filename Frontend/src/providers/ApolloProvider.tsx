import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import type React from 'react';
import { createApolloClient, useApolloAuth } from '../config/apolloClient';

export const ApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { getToken, clearAuth } = useApolloAuth();
    const client = createApolloClient(getToken, clearAuth);

    return (
        <BaseApolloProvider client={client}>
            {children}
        </BaseApolloProvider>
    );
};