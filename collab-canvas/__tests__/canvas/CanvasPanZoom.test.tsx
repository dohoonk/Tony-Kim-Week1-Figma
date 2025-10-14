import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Canvas from '../../src/components/Canvas/Canvas';

function getScale() {
  return Number(screen.getByTestId('scale').textContent);
}

function getPos() {
  return screen.getByTestId('pos').textContent;
}

describe('Canvas pan/zoom', () => {
  it.skip('initializes with scale=1 and position 0,0 and zooms on wheel', async () => {
    render(<Canvas />);
    expect(getScale()).toBeCloseTo(1);
    expect(getPos()).toBe('0,0');

    const container = document.querySelector('.canvas-container') as HTMLElement;
    await userEvent.hover(container);

    const evt = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    container.querySelector('canvas')?.dispatchEvent(evt);

    expect(getScale()).toBeGreaterThan(1);
    expect(getScale()).toBeLessThanOrEqual(4);
  });
});
