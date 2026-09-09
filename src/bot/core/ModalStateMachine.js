'use strict';

const { PATTERNS } = require('../selectors/patterns');

class ModalStateMachine {
  constructor(page, decisionEngine, human, logger) {
    this.page = page;
    this.decision = decisionEngine;
    this.human = human;
    this.logger = logger;
  }

  async handle(addNoteRequested, noteText, shouldStop) {
    const modal = this.page.locator('[role="dialog"]');
    let appeared = false;
    try {
      await modal.first().waitFor({ state: 'visible', timeout: 5000 });
      appeared = true;
    } catch {
      this.logger.debug('No modal appeared. Assuming direct send.');
      return 'sent';
    }

    if (!appeared) return 'sent';
    if (shouldStop()) return 'skipped';

    const type = await this._classifyModal(modal);
    this.logger.info(`🧠 Modal type detected: ${type}`);

    try {
      if (type === 'first') {
        return await this._handleFirstModal(modal, addNoteRequested, noteText, shouldStop);
      } else if (type === 'second') {
        return await this._handleSecondModal(modal, noteText, shouldStop);
      } else if (type === 'pending') {
        this.logger.info('⊘ Invitation already pending — skipping.');
        await this._dismiss(modal);
        return 'skipped';
      } else {
        this.logger.warn('🧠 Unknown modal structure — attempting to close');
        await this._dismiss(modal);
        return 'skipped';
      }
    } catch (err) {
      this.logger.error(`❌ Modal handling error: ${err.message}`);
      await this._dismiss(modal).catch(() => {});
      return 'error';
    }
  }

  async isPendingDialogOpen() {
    try {
      const dialog = this.page.locator('[role="dialog"]').first();
      if (!(await dialog.isVisible().catch(() => false))) return false;
      const text = await dialog.textContent().catch(() => '');
      return PATTERNS.PENDING.test(text || '');
    } catch {
      return false;
    }
  }

  async dismissAnyDialog() {
    try {
      const dialog = this.page.locator('[role="dialog"]').first();
      if (await dialog.isVisible().catch(() => false)) {
        await this._dismiss(dialog);
        await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
      }
    } catch {}
  }

  async _classifyModal(modal) {
    const visible = async (loc) => {
      try { return await loc.isVisible(); } catch { return false; }
    };

    const hasAddNote = await visible(
      modal.getByRole('button', { name: PATTERNS.ADD_NOTE }).first()
    );
    const hasSendWithout = await visible(
      modal.getByRole('button', { name: PATTERNS.SEND_WITHOUT_NOTE }).first()
    );
    const hasTextarea = await visible(modal.locator('textarea').first());

    const text = await modal.textContent().catch(() => '');
    if (PATTERNS.PENDING.test(text || '')) return 'pending';

    if (hasAddNote && hasSendWithout && !hasTextarea) return 'first';
    if (hasTextarea) return 'second';
    return 'unknown';
  }

  async _handleFirstModal(modal, addNoteRequested, noteText, shouldStop) {
    await this._extractQuota(modal);

    const text = await modal.textContent().catch(() => '');
    if (PATTERNS.WEEKLY_LIMIT.test(text)) {
      this.decision.markWeeklyLimitReached();
      await this._dismiss(modal);
      return 'skipped';
    }

    const shouldAdd = this.decision.shouldAddNote(addNoteRequested);

    if (shouldStop()) {
      await this._dismiss(modal);
      return 'skipped';
    }

    if (shouldAdd) {
      const addNoteBtn = modal.getByRole('button', { name: PATTERNS.ADD_NOTE }).first();
      await this.human.moveMouseTo(addNoteBtn);
      await this.human.delayRange(200, 500, shouldStop);
      await addNoteBtn.click();
      await this.human.delayRange(600, 1200, shouldStop);
      return await this._handleSecondModal(modal, noteText, shouldStop);
    } else {
      const sendBtn = modal.getByRole('button', { name: PATTERNS.SEND_WITHOUT_NOTE }).first();
      await this.human.moveMouseTo(sendBtn);
      await this.human.delayRange(200, 500, shouldStop);
      await sendBtn.click();
      await modal.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return 'sent';
    }
  }

  async _handleSecondModal(modal, noteText, shouldStop) {
    const textarea = modal.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 3000 });

    const optimizedText = this.decision.optimizeText(noteText, 200);

    this.logger.info(`✍️ Typing note (${optimizedText.length} chars)...`);
    await textarea.click();
    await textarea.fill('');
    await this.human.type(textarea, optimizedText, shouldStop);

    if (shouldStop()) {
      await this._dismiss(modal);
      return 'skipped';
    }

    await this.human.delayRange(400, 800, shouldStop);

    const sendBtn = modal.getByRole('button', { name: PATTERNS.SEND_INVITATION }).first();
    await sendBtn.waitFor({ state: 'visible', timeout: 3000 });

    let attempts = 0;
    while (attempts < 10) {
      const disabled = await sendBtn.getAttribute('disabled');
      if (disabled === null) break;
      await this.human.delayRange(200, 400, shouldStop);
      attempts++;
    }

    if (shouldStop()) {
      await this._dismiss(modal);
      return 'skipped';
    }

    await this.human.moveMouseTo(sendBtn);
    await this.human.delayRange(150, 350, shouldStop);
    await sendBtn.click();

    this.decision.consumePersonalizedInvitation();

    await modal.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return 'sent';
  }

  async _extractQuota(modal) {
    try {
      const text = await modal.textContent();
      if (!text) return;
      const match = text.match(PATTERNS.PERSONALIZED_REMAINING);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n)) {
          this.decision.updatePersonalizedCount(n);
        }
      }
    } catch {}
  }

  async _dismiss(modal) {
    try {
      const dismissBtn = modal.locator('button[aria-label]').filter({
        hasText: PATTERNS.DISMISS
      }).first();
      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();
        return;
      }
    } catch {}
    try {
      await this.page.keyboard.press('Escape');
    } catch {}
  }
}

module.exports = { ModalStateMachine };
