import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home.jsx';
import Tools from './Tools.jsx';
import Pwned from './Pwned.jsx';
import Infected from './Infected.jsx';
import ToolCard from '../components/ToolCard.jsx';
import { TOOLS } from '../tools/index.js';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('pages render without crashing', () => {
  it('Home', () => { expect(() => wrap(<Home />)).not.toThrow(); });
  it('Tools (renders all ToolCards)', () => { expect(() => wrap(<Tools />)).not.toThrow(); });
  it('Pwned', () => { expect(() => wrap(<Pwned />)).not.toThrow(); });
  it('Infected', () => { expect(() => wrap(<Infected />)).not.toThrow(); });
  it('ToolCard with mixed input types (password tool)', () => {
    const pass = TOOLS.find((t) => t.id === 'pass'); // has number + checkbox inputs
    expect(() => render(<ToolCard tool={pass} />)).not.toThrow();
  });
});
