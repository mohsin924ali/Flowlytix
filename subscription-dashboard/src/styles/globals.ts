/**
 * Global Styles Configuration
 * Global CSS styles for the Flowlytix Dashboard
 * Following Instructions file standards with consistent design system
 */

import { css } from '@emotion/react';
import { brandColors } from './theme';

export const globalStyles = css`
  /* CSS Reset and Base Styles */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    background-color: ${brandColors.neutral[50]};
    color: ${brandColors.neutral[900]};
    font-family:
      'Inter',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      sans-serif;
    font-size: 16px;
    line-height: 1.5;
    overflow-x: hidden;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${brandColors.neutral[100]};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${brandColors.neutral[300]};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${brandColors.neutral[400]};
  }

  /* Focus Styles */
  :focus-visible {
    outline: 2px solid ${brandColors.primary[500]};
    outline-offset: 2px;
  }

  /* Selection Styles */
  ::selection {
    background-color: ${brandColors.primary[100]};
    color: ${brandColors.primary[900]};
  }

  /* Links */
  a {
    color: ${brandColors.primary[500]};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: ${brandColors.primary[600]};
    }

    &:focus {
      outline: 2px solid ${brandColors.primary[500]};
      outline-offset: 2px;
    }
  }

  /* Headings */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 0.5rem;
    color: ${brandColors.neutral[900]};
  }

  /* Paragraphs */
  p {
    margin-bottom: 1rem;
    color: ${brandColors.neutral[700]};
  }

  /* Lists */
  ul,
  ol {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }

  li {
    margin-bottom: 0.25rem;
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Buttons */
  button {
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    padding: 0;
    margin: 0;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  /* Form Elements */
  input,
  textarea,
  select {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    border: 1px solid ${brandColors.neutral[300]};
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    background-color: white;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${brandColors.primary[500]};
      box-shadow: 0 0 0 3px ${brandColors.primary[100]};
    }

    &:disabled {
      background-color: ${brandColors.neutral[100]};
      cursor: not-allowed;
    }
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1rem;
  }

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${brandColors.neutral[200]};
  }

  th {
    background-color: ${brandColors.neutral[50]};
    font-weight: 600;
    color: ${brandColors.neutral[700]};
  }

  /* Utility Classes */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .error {
    color: ${brandColors.error[500]};
  }

  .success {
    color: ${brandColors.success[500]};
  }

  .warning {
    color: ${brandColors.warning[500]};
  }

  /* Animation Classes */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .fade-in {
    animation: fadeIn 0.3s ease;
  }

  .slide-in {
    animation: slideIn 0.3s ease;
  }

  .pulse {
    animation: pulse 2s infinite;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.5rem;
    }

    h3 {
      font-size: 1.25rem;
    }
  }

  /* Print Styles */
  @media print {
    * {
      box-shadow: none !important;
      text-shadow: none !important;
    }

    body {
      background: white !important;
      color: black !important;
    }

    .no-print {
      display: none !important;
    }
  }

  /* Dark Mode Support (Future Enhancement) */
  @media (prefers-color-scheme: dark) {
    /* Dark mode styles will be added here when implementing dark mode */
  }
`;
