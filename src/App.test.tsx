import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DuelSocial app', () => {
  render(<App />);
  const titleElement = screen.getByText(/DuelSocial/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders username input', () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/Enter your username/i);
  expect(inputElement).toBeInTheDocument();
});
