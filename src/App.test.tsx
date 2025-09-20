// Mock socket.io-client module before any imports
jest.mock('socket.io-client', () => ({
  io: () => ({
    on: jest.fn(),
    emit: jest.fn(),
    close: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

test('app renders without crashing', () => {
  const { container } = renderApp();
  expect(container).toBeTruthy();
});

test('app component structure exists', () => {
  const { container } = renderApp();
  // Just verify the container has some content
  expect(container.firstChild).toBeTruthy();
});
