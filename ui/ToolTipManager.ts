import type { Card, Status } from '../types';
export class TooltipManager {
  private tooltipEl: HTMLElement | null = null;

  constructor() {
    const el = document.createElement('div');
    el.id = 'card-tooltip';
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      background: rgba(20, 20, 40, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 10px 14px;
      color: #ffffff;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      max-width: 220px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(el);
    this.tooltipEl = el;
  }


//Display card details at cursor position
  show(card: Card, screenX: number, screenY: number): void {
    if (!this.tooltipEl) return;

    const el = this.tooltipEl;
    const typeColor = this.getTypeColor(card.type);

    el.innerHTML = `
      <div style="margin-bottom: 4px; font-weight: 600; color: ${typeColor}">
        ${card.name} ${card.upgraded ? '⬆️' : ''}
      </div>
      <div style="font-size: 11px; color: #aaa; margin-bottom: 6px;">
        ${card.type} · Cost: ${card.cost}
      </div>
      <div style="font-size: 12px; color: #ddd; line-height: 1.4;">
        ${this.getEffectDescription(card)}
      </div>
      ${card.exhaust ? '<div style="font-size: 10px; color: #888; margin-top: 4px;">💀 Exhaust</div>' : ''}
    `;

    el.style.left = `${screenX - 110}px`;
    el.style.top = `${screenY - el.offsetHeight - 10}px`;
    el.style.opacity = '1';
  }

  showStatus(status: Status, screenX: number, screenY: number): void {
    if (!this.tooltipEl) return;

    const el = this.tooltipEl;
    const durationText = status.duration == null ? 'Persistent' : `${status.duration} turn${status.duration === 1 ? '' : 's'}`;
    el.innerHTML = `
      <div style="margin-bottom: 4px; font-weight: 700; color: #f6d8a7;">
        ${status.name}
      </div>
      <div style="font-size: 11px; color: #b8a88d; margin-bottom: 6px;">
        Stacks: ${status.stacks} · ${durationText}
      </div>
      <div style="font-size: 12px; color: #ddd; line-height: 1.4;">
        ${status.description}
      </div>
    `;
    this.position(screenX, screenY);
  }