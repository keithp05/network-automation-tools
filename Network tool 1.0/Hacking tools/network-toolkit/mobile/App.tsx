import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './src/store';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { theme } from './src/theme';

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </PaperProvider>
    </ReduxProvider>
  );
}